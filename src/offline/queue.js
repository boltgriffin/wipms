/**
 * The offline attendance queue.
 *
 * A scan taken with no signal is written here, on the student's own device, with the real moment and
 * the real coordinates it was taken at. It is sent when the connection comes back, and the server —
 * not this file — decides whether it is accepted, using `offline_id` to recognise a scan it has
 * already stored. That is what makes a retry safe: sending the same record twice records it once.
 *
 * Status lifecycle, and why FAILED is not retried on its own:
 *
 *   PENDING  waiting for a connection. Retried automatically, for as long as it takes.
 *   SYNCING  handed to the server, no answer yet. Reverts to PENDING if the app dies mid-send.
 *   SYNCED   the server stored it. Kept for a day so the student can see it landed, then pruned.
 *   FAILED   the server refused it for a reason that will not change by trying again — the day is
 *            locked, the student is not deployed, the institution is closed. Retrying in a loop
 *            would never succeed, so it stops and shows the reason. Nothing is deleted: the student
 *            can retry it by hand after their teacher fixes the cause, or discard it.
 *
 * A dropped connection is not a refusal. The whole batch goes back to PENDING and is tried again.
 */
import { STORES, store } from './db';

export const SYNC_STATUS = { PENDING: 'PENDING', SYNCING: 'SYNCING', SYNCED: 'SYNCED', FAILED: 'FAILED' };
export const OFFLINE_SOURCE = 'OFFLINE_SYNC';

const MAX_PENDING = 100;      // two scans a day: fifty days offline before this bites
const BATCH = 20;             // the server accepts 25 per call; leave headroom
const STUCK_MS = 2 * 60 * 1000;
const KEEP_SYNCED_MS = 24 * 60 * 60 * 1000;
const LEGACY_KEY = 'wipms-offline-scans';

const q = () => store(STORES.QUEUE);
const isPending = (r) => r.sync_status === SYNC_STATUS.PENDING;

export function newOfflineId() {
  const rnd = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    : Math.random().toString(16).slice(2, 14);
  return `k-${Date.now()}-${rnd}`;
}

/** Oldest first, which is also the order they must reach the server in. */
export async function listQueue() {
  const all = await q().all();
  return all.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export async function queueCounts() {
  const all = await q().all();
  const n = (s) => all.filter((r) => r.sync_status === s).length;
  return {
    pending: n(SYNC_STATUS.PENDING) + n(SYNC_STATUS.SYNCING),
    failed: n(SYNC_STATUS.FAILED),
    synced: n(SYNC_STATUS.SYNCED),
    total: all.length
  };
}

/**
 * Stores one scan. `position` is the GPS fix as the browser gave it; `action` is what the student
 * pressed, kept for the display here — the server works out time in versus time out from the day's
 * existing row, so the two can never disagree with the sheet.
 *
 * The record is read back before this reports success. On a device where storage is full or blocked,
 * a write can be accepted and keep nothing, and telling a student their attendance is safe when it
 * is not is the one failure this whole feature exists to prevent.
 */
export async function saveOffline({ studentId, action, position, confirm, selfie, userAgent }) {
  const all = await q().all();
  if (all.filter(isPending).length >= MAX_PENDING) {
    return { ok: false, error: `There are already ${MAX_PENDING} scans waiting to be sent from this device. Connect to the internet so they can be uploaded first.` };
  }
  const now = new Date();
  const record = {
    offline_id: newOfflineId(),
    student_id: String(studentId || ''),
    action: action || '',
    timestamp: now.toISOString(),
    latitude: position.lat,
    longitude: position.lng,
    attendance_source: OFFLINE_SOURCE,
    sync_status: SYNC_STATUS.PENDING,
    created_at: now.toISOString(),
    // kept beside the specified fields because the server needs them to judge the scan
    accuracy: position.accuracy ?? null,
    age_ms: position.ageMs ?? 0,
    confirm: !!confirm,
    selfie: selfie || null,
    user_agent: String(userAgent || '').slice(0, 200),
    attempts: 0,
    error: ''
  };
  await q().put(record);
  const saved = await q().get(record.offline_id);
  if (!saved) {
    return { ok: false, error: 'This device would not save the scan — its storage is full or blocked. Free some space, or ask your student leader to record this for you.' };
  }
  return { ok: true, record, pending: all.filter(isPending).length + 1 };
}

/** The payload shape the /attendance/sync endpoint expects. offline_id travels as clientKey. */
const toItem = (r) => ({
  clientKey: r.offline_id,
  capturedAt: r.timestamp,
  lat: r.latitude,
  lng: r.longitude,
  accuracy: r.accuracy,
  ageMs: r.age_ms,
  selfie: r.selfie || undefined
});

let running = false;

/**
 * Sends everything waiting. `send(items)` is the API call; it must resolve to the server's
 * `{ results: [{ clientKey, success, error }] }` or throw for a transport failure.
 *
 * Returns what to tell the student, never throws.
 */
export async function syncQueue(send) {
  if (running) return { skipped: true, accepted: 0, refused: 0, pending: 0, errors: [] };
  running = true;
  try {
    await recoverStuck();
    const due = (await listQueue()).filter(isPending);
    if (!due.length) return { accepted: 0, refused: 0, pending: 0, errors: [], empty: true };

    let accepted = 0, refused = 0;
    const errors = [];
    let stopped = false;

    for (let i = 0; i < due.length && !stopped; i += BATCH) {
      const at = new Date().toISOString();
      // The batch is carried forward with its attempt count already raised, so putting it back
      // after a failure keeps that count rather than quietly resetting it to zero.
      const batch = due.slice(i, i + BATCH)
        .map((r) => ({ ...r, sync_status: SYNC_STATUS.SYNCING, synced_attempt_at: at, attempts: (r.attempts || 0) + 1 }));
      await q().putMany(batch);

      let res;
      try {
        res = await send(batch.map(toItem));
      } catch (e) {
        // Transport fault: the connection went again, or the server never answered. Nothing is lost
        // and nothing is judged — put the whole batch back and stop until next time.
        await q().putMany(batch.map((r) => ({ ...r, sync_status: SYNC_STATUS.PENDING })));
        errors.push(e?.message || 'No connection');
        stopped = true;
        break;
      }

      const byKey = {};
      (res?.results || []).forEach((x) => { byKey[String(x.clientKey)] = x; });
      const done = new Date().toISOString();
      await q().putMany(batch.map((r) => {
        const out = byKey[r.offline_id];
        if (!out) { // the server said nothing about this one: treat it as untouched
          return { ...r, sync_status: SYNC_STATUS.PENDING };
        }
        if (out.success) {
          accepted++;
          return { ...r, sync_status: SYNC_STATUS.SYNCED, synced_at: done, error: '', selfie: null };
        }
        refused++;
        const msg = out.error?.message || 'The server did not accept this scan.';
        errors.push(msg);
        return { ...r, sync_status: SYNC_STATUS.FAILED, error: msg, failed_at: done };
      }));
    }

    await pruneSynced();
    const counts = await queueCounts();
    return { accepted, refused, pending: counts.pending, failed: counts.failed, errors };
  } finally {
    running = false;
  }
}

/** A scan left as SYNCING by an app that was closed mid-send goes back in the queue. */
async function recoverStuck() {
  const all = await q().all();
  const cut = Date.now() - STUCK_MS;
  const stuck = all.filter((r) => r.sync_status === SYNC_STATUS.SYNCING
    && (!r.synced_attempt_at || Date.parse(r.synced_attempt_at) < cut));
  if (stuck.length) await q().putMany(stuck.map((r) => ({ ...r, sync_status: SYNC_STATUS.PENDING })));
}

async function pruneSynced() {
  const all = await q().all();
  const cut = Date.now() - KEEP_SYNCED_MS;
  const old = all.filter((r) => r.sync_status === SYNC_STATUS.SYNCED && Date.parse(r.synced_at || r.created_at) < cut);
  if (old.length) await q().delMany(old.map((r) => r.offline_id));
}

/** Puts a refused scan back in line — for after a teacher has fixed whatever caused the refusal. */
export async function retryFailed(offlineId) {
  const all = await q().all();
  const picked = offlineId ? all.filter((r) => r.offline_id === offlineId) : all.filter((r) => r.sync_status === SYNC_STATUS.FAILED);
  if (picked.length) await q().putMany(picked.map((r) => ({ ...r, sync_status: SYNC_STATUS.PENDING, error: '' })));
  return picked.length;
}

export const discardScan = (offlineId) => q().del(offlineId);

/**
 * Milestone 9 kept the queue in localStorage. Anything a student had waiting there when they update
 * to this version is moved across once, before the first sync, so an upgrade cannot swallow a scan.
 */
export async function migrateLegacyQueue() {
  let old = [];
  try { old = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch { return 0; }
  if (!Array.isArray(old) || !old.length) return 0;
  const existing = new Set((await q().all()).map((r) => r.offline_id));
  const moved = old
    .filter((s) => s && !existing.has(String(s.clientKey)))
    .map((s) => ({
      offline_id: String(s.clientKey || newOfflineId()),
      student_id: '',
      action: '',
      timestamp: s.capturedAt || new Date(s.queuedAt || Date.now()).toISOString(),
      latitude: s.lat,
      longitude: s.lng,
      attendance_source: OFFLINE_SOURCE,
      sync_status: SYNC_STATUS.PENDING,
      created_at: s.capturedAt || new Date(s.queuedAt || Date.now()).toISOString(),
      accuracy: s.accuracy ?? null,
      age_ms: s.ageMs ?? 0,
      confirm: !!s.confirm,
      selfie: s.selfie || null,
      user_agent: String(s.userAgent || '').slice(0, 200),
      attempts: 0,
      error: ''
    }));
  if (moved.length) await q().putMany(moved);
  // Only drop the old list once the new one holds them, so a failure here repeats rather than loses.
  const now = new Set((await q().all()).map((r) => r.offline_id));
  if (moved.every((m) => now.has(m.offline_id))) {
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* nothing to do */ }
  }
  return moved.length;
}
