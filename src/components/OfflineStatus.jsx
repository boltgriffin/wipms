/**
 * What the student needs to know at a glance, standing at the site: is there internet, will GPS
 * work, and has anything they recorded not reached the school yet.
 *
 * The three are kept separate on purpose. "Offline" is not a failure — attendance still records —
 * so it is amber, not red. The only red state here is a scan the server refused, because that is
 * the one case where a student might think they are covered and are not.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { SYNC_STATUS, discardScan, listQueue } from '../offline/queue';
import { btnGhost } from './ui';

const Chip = ({ tone, icon: Icon, children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
    <Icon size={13} aria-hidden="true" />{children}
  </span>
);

const GPS_CHIP = {
  granted: { tone: 'bg-green-100 text-green-800', label: 'GPS allowed', note: 'Location permission is already granted on this device' },
  prompt: { tone: 'bg-blue-100 text-blue-800', label: 'GPS will be asked', note: 'Your browser asks for location the first time you record' },
  denied: { tone: 'bg-red-100 text-red-700', label: 'GPS blocked', note: 'Location is blocked for this site, so attendance cannot be recorded' },
  unsupported: { tone: 'bg-red-100 text-red-700', label: 'No GPS', note: 'This browser cannot read a location' },
  unknown: { tone: 'bg-gray-100 text-gray-700', label: 'GPS checked when you record', note: 'This browser does not report the permission in advance' }
};

/** The chip row. `source` is how today's attendance was actually captured, once there is any. */
export function OfflineStatus({ online, gps, counts, syncing }) {
  const g = GPS_CHIP[gps] || GPS_CHIP.unknown;
  const waiting = counts.pending > 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {online
        ? <Chip tone="bg-green-100 text-green-800" icon={Wifi} title="Connected to the internet">Online</Chip>
        : <Chip tone="bg-amber-100 text-amber-900" icon={WifiOff} title="No connection. Attendance is saved on this device.">Offline mode</Chip>}
      <Chip tone={g.tone} icon={MapPin} title={g.note}>{g.label}</Chip>
      {syncing
        ? <Chip tone="bg-blue-100 text-blue-800" icon={RefreshCw} title="Uploading saved scans">Syncing…</Chip>
        : waiting
          ? <Chip tone="bg-amber-100 text-amber-900" icon={Clock} title="Saved on this device, not yet at the school">{counts.pending} pending sync</Chip>
          : <Chip tone="bg-green-100 text-green-800" icon={CheckCircle2} title="Everything recorded on this device has reached the school">Synced</Chip>}
      {counts.failed > 0 && (
        <Chip tone="bg-red-100 text-red-700" icon={AlertTriangle} title="The server refused these. They are still on your device.">
          {counts.failed} refused
        </Chip>)}
    </div>
  );
}

/**
 * The scans that have not landed. Pending ones need no action and say so; refused ones carry the
 * server's reason, and can be retried once the cause is fixed or discarded if they were a mistake.
 * Nothing is ever removed without the student saying so.
 */
export function PendingScans({ counts, online, syncing, onSync, onRetry, onChanged }) {
  const [rows, setRows] = useState([]);
  const [confirmId, setConfirmId] = useState('');

  useEffect(() => {
    let alive = true;
    listQueue().then((all) => {
      if (alive) setRows(all.filter((r) => r.sync_status !== SYNC_STATUS.SYNCED));
    });
    return () => { alive = false; };
  }, [counts.pending, counts.failed, syncing]);

  if (!rows.length) return null;
  const when = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(); };

  const drop = async (id) => { await discardScan(id); setConfirmId(''); onChanged?.(); };

  return (
    <section className="mb-4 rounded-xl border border-forest-100 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold">Saved on this device</h2>
        <button onClick={onSync} disabled={!online || syncing || !counts.pending} className={btnGhost}>
          {syncing ? 'Sending…' : 'Send now'}
        </button>
      </div>
      <ul className="divide-y divide-forest-100 text-sm">
        {rows.map((r) => (
          <li key={r.offline_id} className="flex flex-wrap items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-medium">{r.action === 'TIME_OUT' ? 'Time out' : r.action === 'TIME_IN' ? 'Time in' : 'Attendance'} &middot; {when(r.timestamp)}</p>
              <p className="text-xs text-forest-700">
                {r.latitude != null ? `Location saved (${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)})` : 'No location'}
                {r.accuracy != null ? ` · accurate to ${Math.round(r.accuracy)} m` : ''}
              </p>
              {r.sync_status === SYNC_STATUS.FAILED && <p className="mt-1 text-xs font-medium text-red-700">{r.error}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.sync_status === SYNC_STATUS.FAILED
                ? (confirmId === r.offline_id
                  ? (<>
                      <span className="text-xs">Delete it?</span>
                      <button onClick={() => drop(r.offline_id)} className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">Delete</button>
                      <button onClick={() => setConfirmId('')} className="text-xs underline">Keep</button>
                    </>)
                  : (<>
                      <button onClick={() => onRetry(r.offline_id)} disabled={!online} className="inline-flex items-center gap-1 text-xs font-semibold underline disabled:opacity-50">
                        <RefreshCw size={12} aria-hidden="true" />Try again
                      </button>
                      <button onClick={() => setConfirmId(r.offline_id)} aria-label="Discard this scan" className="text-forest-700 hover:text-red-700">
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </>))
                : <span className="inline-flex items-center gap-1 text-xs text-forest-700"><Clock size={12} aria-hidden="true" />Waiting</span>}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-forest-700">
        These are on this phone only. They reach your teacher as soon as it has internet, and they are not
        counted in your hours until then.
      </p>
    </section>
  );
}
