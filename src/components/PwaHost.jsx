/**
 * The three things the app needs on every screen, mounted once: a line telling people when they
 * have lost the connection, the install card, and a quiet notice when a new version is ready.
 *
 * The offline line is for everyone, not just students. A teacher approving a DTR on a patchy
 * connection needs to know the save will not go through before they type the remarks, not after.
 */
import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff, X } from 'lucide-react';
import InstallPrompt from './InstallPrompt';
import { useOnline } from '../hooks/useOffline';
import { applyUpdate, subscribeSw } from '../offline/sw';

function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-forest-900">
      <WifiOff size={13} aria-hidden="true" />
      You are offline. Attendance is saved on this device and sent when you reconnect.
    </div>
  );
}

function UpdateNotice() {
  const [need, setNeed] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => subscribeSw((s) => setNeed(s.needRefresh)), []);
  if (!need || hidden) return null;
  return (
    <div role="status"
      className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-forest-100 bg-surface p-3 text-sm shadow-lg">
      <RefreshCw size={16} aria-hidden="true" className="shrink-0" />
      <span className="flex-1">A new version is ready.</span>
      <button onClick={() => applyUpdate()} className="rounded bg-amber-500 px-3 py-1 text-xs font-semibold text-forest-900">Reload</button>
      <button onClick={() => setHidden(true)} aria-label="Dismiss" className="text-forest-700"><X size={14} aria-hidden="true" /></button>
    </div>
  );
}

export default function PwaHost() {
  return (<><OfflineBar /><UpdateNotice /><InstallPrompt /></>);
}
