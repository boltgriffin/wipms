// Scans taken while the device is offline wait here until the browser is back online.
// They live in localStorage, which is per browser and per device: a scan queued on a phone is sent from that phone.
const KEY = 'wipms-offline-scans';

const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (q) => { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* storage full or blocked */ } };

export const newClientKey = () => `k-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
export const listQueue = () => read();
export const queueSize = () => read().length;

/** Saves one scan for later. capturedAt is the real moment it happened, which is what the server records. */
export function enqueue(scan) {
  const q = read();
  if (q.length >= 50) return { ok: false, error: 'Too many saved scans are already waiting. Connect to the internet first.' };
  q.push({ ...scan, clientKey: scan.clientKey || newClientKey(), capturedAt: scan.capturedAt || new Date().toISOString(), queuedAt: Date.now() });
  write(q);
  return { ok: true, size: q.length };
}
export function removeKeys(keys) {
  const set = new Set(keys);
  write(read().filter((x) => !set.has(x.clientKey)));
}
export function clearQueue() { write([]); }

/** Sends the queue in batches. Anything the server refuses for good (not a network fault) is dropped so it cannot loop. */
export async function flushQueue(send) {
  const q = read();
  if (!q.length) return { sent: 0, accepted: 0, rejected: 0, errors: [] };
  const done = [], errors = [];
  let accepted = 0, rejected = 0;
  for (let i = 0; i < q.length; i += 10) {
    const batch = q.slice(i, i + 10);
    let res;
    try { res = await send(batch.map(({ queuedAt, ...rest }) => rest)); } catch (e) { errors.push(e.message); break; } // network down again: keep the rest
    (res.results || []).forEach((r) => {
      done.push(r.clientKey);
      if (r.success) accepted++; else { rejected++; errors.push(r.error?.message || 'Rejected'); }
    });
  }
  removeKeys(done);
  return { sent: done.length, accepted, rejected, errors };
}
