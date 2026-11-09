/**
 * Installing the app on each kind of device.
 *
 * Android, Windows, macOS Chrome/Edge and Chromebooks fire `beforeinstallprompt`, which can be held
 * and replayed from a button. The event fires once, early, and is gone if nobody catches it — so it
 * is caught here at module load, before React renders.
 *
 * iPhone and iPad are different, and no amount of code changes it: Safari has never implemented
 * `beforeinstallprompt`. There is no button that can install a web app on iOS. The only route is
 * the Share sheet, so on iOS this module reports `manual` and the prompt shows the three steps
 * instead of a button that could not work.
 */
const SNOOZE_KEY = 'wipms-install-snoozed-until';
const SNOOZE_DAYS = 7;

let deferred = null;
let installed = false;
const subs = new Set();
const notify = () => subs.forEach((fn) => fn(snapshot()));

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent || '');

/** iPadOS 13+ reports itself as a Mac, so a Mac with a touch screen is an iPad. */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(ua())
    || (/Macintosh/.test(ua()) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1);
}

/** True once the app is running from the home screen or the dock rather than a browser tab. */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;
}

function snoozedUntil() {
  try { return Number(localStorage.getItem(SNOOZE_KEY) || 0); } catch { return 0; }
}

export function snoozeInstall() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400000)); } catch { /* fine */ }
  notify();
}

export function snapshot() {
  return {
    installed: installed || isStandalone(),
    /** 'prompt' — a button can install it; 'manual' — iOS, show the Share steps; 'none' — nothing to offer. */
    mode: isStandalone() || installed ? 'none' : deferred ? 'prompt' : isIos() ? 'manual' : 'none',
    snoozed: Date.now() < snoozedUntil()
  };
}

export function subscribeInstall(fn) {
  subs.add(fn);
  fn(snapshot());
  return () => subs.delete(fn);
}

/** Replays the held event. Resolves to the outcome so the caller can stop offering it. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  notify();
  try {
    e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome !== 'accepted') snoozeInstall();
    return outcome;
  } catch {
    return 'failed';
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // keep the browser's own banner out of the way
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}
