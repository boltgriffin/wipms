/**
 * The read caches: what the app can show before — or without — an answer from the server.
 *
 * Only a student's own small, current picture is kept: who they are, where they are deployed, and
 * today's attendance with their running hours. Reports, analytics, student lists and PDFs are
 * deliberately not cached. They are large, they go stale in ways that matter, and nobody needs them
 * at an immersion site with no signal.
 *
 * Everything is scoped to the session token. A phone shared between two students must never show
 * one of them the other's hours, so a cache entry written under one token is invisible under
 * another, and `clearCaches()` empties them at sign-out.
 */
import { STORES, store } from './db';

const dash = () => store(STORES.DASHBOARD);
const users = () => store(STORES.USER);
const insts = () => store(STORES.INSTITUTION);

/** Tokens are long; a short stable fingerprint is enough to tell one session's cache from another. */
function scope(token) {
  const t = String(token || '');
  if (!t) return 'anon';
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return `s${(h >>> 0).toString(36)}`;
}

/* ---------- Dashboard ---------- */

export async function putDashboard(token, name, data) {
  if (data == null) return;
  await dash().put({ key: `${scope(token)}:${name}`, name, data, saved_at: Date.now() });
}

export async function getDashboard(token, name) {
  const row = await dash().get(`${scope(token)}:${name}`);
  return row || null;
}

/** Everything cached for this session, for hydrating the query client in one pass at startup. */
export async function allDashboard(token) {
  const prefix = `${scope(token)}:`;
  return (await dash().all()).filter((r) => String(r.key).startsWith(prefix));
}

/* ---------- User ---------- */

export const putUser = (token, user, stats) =>
  users().put({ key: scope(token), user, stats: stats || null, saved_at: Date.now() });

export async function getUser(token) {
  const row = await users().get(scope(token));
  return row || null;
}

/* ---------- Institution ---------- */

export async function putInstitution(token, workplace) {
  if (!workplace) return;
  await insts().put({ key: `${scope(token)}:${workplace.institutionId || workplace.id || 'current'}`, workplace, saved_at: Date.now() });
}

export async function getInstitution(token, id) {
  const row = await insts().get(`${scope(token)}:${id || 'current'}`);
  return row?.workplace || null;
}

/* ---------- Lifecycle ---------- */

/** Sign-out wipes the caches. The attendance queue is left alone: those scans are not yet recorded. */
export async function clearCaches() {
  await Promise.all([dash().clear(), users().clear(), insts().clear()]);
}

/**
 * Paints the last known dashboard into React Query before the first render, so an installed app
 * opens on the student's real figures instead of a spinner. `dataUpdatedAt` is set to when the data
 * was actually fetched, which leaves it stale — React Query then refetches in the background and
 * the screen corrects itself as soon as the network answers.
 */
export async function hydrateQueryCache(queryClient, token) {
  if (!token) return 0;
  const rows = await allDashboard(token);
  rows.forEach((r) => {
    const key = CACHED_QUERIES[r.name];
    if (key) queryClient.setQueryData(key, r.data, { updatedAt: r.saved_at });
  });
  return rows.length;
}

/** The only queries worth keeping on the device, and the keys they live under. */
export const CACHED_QUERIES = {
  'dtr:today': ['dtr', 'today'],
  'dtr:mine': ['dtr', 'mine']
};
