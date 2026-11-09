import { useState } from 'react';
import { AlertTriangle, Database, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/datatable';
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import DangerDialog from '../components/DangerDialog';
import SystemReady from '../components/SystemReady';
import { useResetImpact, useResetOverview, useRunReset } from '../hooks/useSystem';

/**
 * The most dangerous page in the system, and it is written to feel like it.
 *
 * Every option carries its live row count on the face of the page, so "Reset Everything" is never
 * an abstract phrase — it says how many thousands of records it would take. Choosing one opens the
 * four-step confirmation, and a backup is taken and verified before anything is deleted.
 */
const GROUPS = [
  { title: 'One module at a time', keys: ['students', 'teachers', 'supervisors', 'institutions'] },
  { title: 'Activity records', keys: ['attendance', 'journals', 'evaluations', 'merits', 'infractions', 'gps', 'notifications'] },
  { title: 'Whole-system', keys: ['accounts', 'schoolyear', 'everything'] }
];
const SEVERE = ['everything', 'accounts', 'schoolyear'];

export default function ResetCenter() {
  const { data, isLoading, error } = useResetOverview();
  const [chosen, setChosen] = useState('');
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null);
  const impact = useResetImpact(open ? chosen : '');
  const run = useRunReset();

  if (isLoading) return <p className="text-sm">Loading...</p>;
  if (error) return <ErrorBanner error={error} />;

  const byKey = {};
  (data.options || []).forEach((o) => { byKey[o.key] = o; });
  const picked = byKey[chosen];

  return (
    <>
      <PageHeader title="System Reset Center" subtitle="Clear out part of the system, or all of it, with a backup taken first." />

      <SystemReady ready={data.ready} />

      <p className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <ShieldAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          Everything on this page deletes records permanently. There is no Trash Bin for a reset — the bin
          holds single records, and a reset is thousands of rows at once. What stands behind it is the backup
          taken automatically before each one: if that backup cannot be made and read back, the reset does not run.
        </span>
      </p>

      <section className="mb-6 rounded-xl border border-forest-100 bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
          <Database size={15} aria-hidden="true" />What is in the system right now
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(data.snapshot || []).map((s) => (
            <div key={s.sheet}>
              <dt className="text-xs text-forest-700">{s.label}</dt>
              <dd className="text-xl font-bold">{s.rows.toLocaleString()}</dd>
            </div>))}
        </dl>
      </section>

      {done && (
        <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-semibold text-green-900">{done.label} finished.</p>
          <p className="mt-1">{done.message}</p>
          {done.backup && <p className="mt-2 text-xs">The backup is in the Backup &amp; Restore page as <strong>{done.backup.name}</strong>.</p>}
          <button onClick={() => setDone(null)} className="mt-2 text-xs underline">Dismiss</button>
        </div>)}

      <label className="block text-sm font-medium" htmlFor="rs-opt">Select reset option</label>
      <select id="rs-opt" className={`mt-1 max-w-lg ${inputCls}`} value={chosen} onChange={(e) => setChosen(e.target.value)}>
        <option value="">Choose what to reset...</option>
        {GROUPS.map((g) => (
          <optgroup key={g.title} label={g.title}>
            {g.keys.filter((k) => byKey[k]).map((k) => (
              <option key={k} value={k}>{byKey[k].label} — {byKey[k].totalRows.toLocaleString()} rows</option>))}
          </optgroup>))}
      </select>

      {picked && (
        <section className={`mt-5 max-w-3xl rounded-xl border p-5 ${SEVERE.includes(chosen) ? 'border-red-300 bg-red-50/60' : 'border-forest-100 bg-surface'}`}>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {SEVERE.includes(chosen) && <AlertTriangle size={18} className="text-red-700" aria-hidden="true" />}
            {picked.label}
          </h2>
          <p className="mt-2 text-3xl font-bold">{picked.totalRows.toLocaleString()}
            <span className="ml-2 text-sm font-normal text-forest-700">rows would be removed</span></p>
          {picked.note && <p className="mt-3 text-sm">{picked.note}</p>}
          <p className="mt-3 text-xs text-forest-700">
            Always kept: the school branding, the system settings, the conduct types, the audit log, the backup
            records, and your own administrator account.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => setOpen(true)} disabled={!picked.totalRows}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {picked.totalRows ? 'Review and reset' : 'Nothing to reset'}
            </button>
            <button onClick={() => setChosen('')} className={btnGhost}>Choose something else</button>
          </div>
          {!picked.totalRows && picked.note && <p className="mt-2 text-xs text-forest-700">{picked.note}</p>}
        </section>)}

      {open && picked && (
        <DangerDialog
          title={picked.label}
          phrase={picked.phrase}
          actionLabel={'Yes, run ' + picked.label.toLowerCase()}
          summary={'About to remove ' + (impact.data?.totalRows || 0).toLocaleString() + ' rows. This cannot be undone except from the backup.'}
          busy={run.isPending}
          error={run.error}
          impactLoading={impact.isLoading}
          impact={impact.data?.affected}
          onCancel={() => { setOpen(false); run.reset(); }}
          onConfirm={(creds) => run.mutate({ ...creds, option: chosen }, {
            onSuccess: (d) => { setOpen(false); setDone(d); setChosen(''); }
          })}
        >
          {impact.data?.detaches?.length ? (
            <div className="mt-3 rounded bg-blue-50 p-3 text-sm">
              <p className="font-semibold">Not deleted, only unlinked:</p>
              <ul className="mt-1 list-inside list-disc text-xs">
                {impact.data.detaches.map((d) => (
                  <li key={d.sheet + d.column}>{d.rows.toLocaleString()} {(d.label || d.sheet).toLowerCase()} lose their {d.column}, but the records stay.</li>))}
              </ul>
            </div>) : null}
          {impact.data?.note && <p className="mt-3 text-sm">{impact.data.note}</p>}
        </DangerDialog>)}
    </>
  );
}
