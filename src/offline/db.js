/**
 * WIMS_DB — the device's own small database.
 *
 * Four stores, as specified: the attendance queue, and three read caches that let the app paint
 * something useful before (or instead of) a network reply.
 *
 * Two things matter more here than elegance:
 *
 * 1. It must never throw at the caller. A student standing at an immersion site with no signal is
 *    the whole reason this file exists; an unhandled rejection there loses their time in.
 * 2. IndexedDB is not always there. Safari in a private window, a locked-down Chromebook profile and
 *    a browser with site data blocked all fail at `indexedDB.open`. So there is a localStorage
 *    driver behind the same four methods, and the queue never knows which one it got. localStorage
 *    is smaller and synchronous, but a few dozen attendance rows fit in it comfortably.
 */
const DB_NAME = 'WIMS_DB';
const DB_VERSION = 1;

export const STORES = {
  QUEUE: 'attendance_queue',
  DASHBOARD: 'dashboard_cache',
  USER: 'user_cache',
  INSTITUTION: 'institution_cache'
};
const KEY_PATH = {
  [STORES.QUEUE]: 'offline_id',
  [STORES.DASHBOARD]: 'key',
  [STORES.USER]: 'key',
  [STORES.INSTITUTION]: 'key'
};

/* ---------- IndexedDB driver ---------- */

let opening = null;
let idbBroken = false;

function openDb() {
  if (idbBroken || typeof indexedDB === 'undefined') return Promise.reject(new Error('NO_IDB'));
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return reject(e); }
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.values(STORES).forEach((name) => {
        if (db.objectStoreNames.contains(name)) return;
        const s = db.createObjectStore(name, { keyPath: KEY_PATH[name] });
        if (name === STORES.QUEUE) s.createIndex('sync_status', 'sync_status', { unique: false });
      });
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgraded the schema: let go of this handle rather than block it.
      db.onversionchange = () => { db.close(); opening = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'));
    req.onblocked = () => reject(new Error('IDB_BLOCKED'));
  }).catch((e) => { opening = null; idbBroken = true; throw e; });
  return opening;
}

function idbTx(name, mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(name, mode); } catch (e) { return reject(e); }
    let out;
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IDB_ABORT'));
    const asked = run(tx.objectStore(name));
    if (asked) asked.onsuccess = () => { out = asked.result; };
  }));
}

const idbDriver = (name) => ({
  get: (key) => idbTx(name, 'readonly', (s) => s.get(key)),
  all: () => idbTx(name, 'readonly', (s) => s.getAll()),
  put: (value) => idbTx(name, 'readwrite', (s) => s.put(value)),
  putMany: (values) => idbTx(name, 'readwrite', (s) => { values.forEach((v) => s.put(v)); }),
  del: (key) => idbTx(name, 'readwrite', (s) => s.delete(key)),
  delMany: (keys) => idbTx(name, 'readwrite', (s) => { keys.forEach((k) => s.delete(k)); }),
  clear: () => idbTx(name, 'readwrite', (s) => s.clear())
});

/* ---------- localStorage driver, for browsers that refuse IndexedDB ---------- */

const lsKey = (name) => `WIMS_DB:${name}`;
const lsRead = (name) => {
  try { const v = JSON.parse(localStorage.getItem(lsKey(name)) || '{}'); return v && typeof v === 'object' ? v : {}; }
  catch { return {}; }
};
const lsWrite = (name, map) => {
  try { localStorage.setItem(lsKey(name), JSON.stringify(map)); return true; }
  catch { return false; } // quota or blocked: the caller still gets a resolved promise, and sees it on the next read
};

const lsDriver = (name) => {
  const kp = KEY_PATH[name];
  const mutate = (fn) => { const m = lsRead(name); fn(m); lsWrite(name, m); };
  return {
    get: (key) => Promise.resolve(lsRead(name)[key]),
    all: () => Promise.resolve(Object.values(lsRead(name))),
    put: (value) => { mutate((m) => { m[value[kp]] = value; }); return Promise.resolve(); },
    putMany: (values) => { mutate((m) => values.forEach((v) => { m[v[kp]] = v; })); return Promise.resolve(); },
    del: (key) => { mutate((m) => { delete m[key]; }); return Promise.resolve(); },
    delMany: (keys) => { mutate((m) => keys.forEach((k) => { delete m[k]; })); return Promise.resolve(); },
    clear: () => { lsWrite(name, {}); return Promise.resolve(); }
  };
};

/* ---------- One store handle, whichever driver answers ---------- */

const cache = new Map();

/**
 * Returns the store, preferring IndexedDB and falling back the first time it refuses. Every method
 * resolves; nothing here rejects, because a caller in the middle of recording attendance has no
 * useful way to recover from a storage fault except to try the other driver.
 */
export function store(name) {
  if (cache.has(name)) return cache.get(name);
  const idb = idbDriver(name), ls = lsDriver(name);
  const wrap = (method) => (...args) =>
    idb[method](...args).catch(() => ls[method](...args)).catch(() => (method === 'all' ? [] : undefined));
  const handle = {
    get: wrap('get'), all: wrap('all'), put: wrap('put'), putMany: wrap('putMany'),
    del: wrap('del'), delMany: wrap('delMany'), clear: wrap('clear')
  };
  cache.set(name, handle);
  return handle;
}

/** True once IndexedDB has actually answered — used only to tell the student where their data sits. */
export async function storageKind() {
  try { await openDb(); return 'indexeddb'; } catch { return 'localstorage'; }
}
