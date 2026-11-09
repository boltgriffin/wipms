/**
 * Connectivity, the waiting queue, and sending it.
 *
 * There is no Background Sync here, deliberately. Chrome's Background Sync API would let the
 * browser upload the queue with the app closed, but Safari does not implement it, and roughly half
 * the phones at a Philippine senior high school are iPhones. One mechanism that works everywhere is
 * worth more than two that behave differently: the queue is sent when the connection returns while
 * the app is open, and whenever the app is brought back to the front. In practice a student opens
 * the app to time out, and yesterday's scans go up then.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { migrateLegacyQueue, queueCounts, retryFailed, syncQueue } from '../offline/queue';
import { gpsService } from '../services/gpsService';
import { useAuthStore } from '../store/authStore';

const EMPTY = { pending: 0, failed: 0, synced: 0, total: 0 };

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

/**
 * `onSynced` runs after anything was accepted, so the page can refetch the figures the upload moved.
 */
export function useOfflineSync({ onSynced } = {}) {
  const token = useAuthStore((s) => s.token);
  const online = useOnline();
  const [counts, setCounts] = useState(EMPTY);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const synced = useRef(onSynced);
  synced.current = onSynced;

  const refresh = useCallback(async () => { setCounts(await queueCounts()); }, []);

  const sync = useCallback(async (quiet) => {
    if (!token) return;
    if (!navigator.onLine) { if (!quiet) setMessage('Still offline. Your saved scans stay on this device until you reconnect.'); return; }
    const before = await queueCounts();
    if (!before.pending) { if (!quiet) setMessage('Nothing is waiting to be sent.'); return; }
    setSyncing(true);
    if (!quiet) setMessage('Sending saved scans…');
    const r = await syncQueue((items) => gpsService.sync(token, items));
    setSyncing(false);
    await refresh();
    if (r.skipped) return;
    if (r.accepted || r.refused) {
      const parts = [];
      if (r.accepted) parts.push(`${r.accepted} saved scan${r.accepted === 1 ? '' : 's'} recorded`);
      if (r.refused) parts.push(`${r.refused} refused: ${r.errors.slice(0, 2).join('; ')}`);
      setMessage(`${parts.join(', ')}.`);
      if (r.accepted) synced.current?.();
    } else if (!quiet) {
      setMessage(`Could not send yet: ${r.errors[0] || 'no connection'}.`);
    }
  }, [token, refresh]);

  // One-time move of anything the previous version left in localStorage, then a first count.
  useEffect(() => { migrateLegacyQueue().then(refresh); }, [refresh]);

  // The connection came back, or the student reopened the app. Either is a chance to catch up.
  useEffect(() => {
    if (!online || !token) return;
    let alive = true;
    const run = () => { if (alive && !document.hidden) sync(true); };
    run();
    const onVisible = () => { if (!document.hidden && navigator.onLine) sync(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, [online, token, sync]);

  const retry = useCallback(async (id) => {
    await retryFailed(id);
    await refresh();
    await sync(false);
  }, [refresh, sync]);

  return { online, counts, syncing, message, setMessage, sync, refresh, retry };
}

/**
 * Whether location is available, without asking for it. The Permissions API is the only way to read
 * this without triggering the prompt, and Safari does not expose geolocation through it — so on
 * iPhone the honest answer is "we will find out when you press the button", which is what 'unknown'
 * renders as.
 */
export function useGpsPermission() {
  const [state, setState] = useState('unknown'); // granted | prompt | denied | unsupported | unknown
  useEffect(() => {
    let alive = true;
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setState('unsupported'); return; }
    if (!navigator.permissions?.query) return;
    let status;
    navigator.permissions.query({ name: 'geolocation' })
      .then((s) => {
        if (!alive) return;
        status = s;
        setState(s.state);
        s.onchange = () => setState(s.state);
      })
      .catch(() => { /* leave it at unknown */ });
    return () => { alive = false; if (status) status.onchange = null; };
  }, []);
  return state;
}
