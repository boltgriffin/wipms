import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText, Info, Lock } from 'lucide-react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { CORRECTION_META, CorrectionTag, DtrTable, HoursProgress, SourceLegend, StatusTag } from '../components/dtrUi';
import CsFormPanel from '../components/CsFormPanel';
import { useDtrAction, useMyDtr } from '../hooks/useDtr';
import { useBranding } from '../hooks/useShell';
import { exportDtr } from '../export/dtrPdf';

const TYPES = [
  ['MISSING_TIME_OUT', 'I forgot to time out', 'Your teacher will set the time you actually left.'],
  ['GPS_ERROR', 'The GPS was wrong', 'Use this when you were at the institution but the location check failed.'],
  ['CORRECTION', 'A time is wrong', 'Ask for the time in, the time out, or both to be corrected.']
];

/** The request form. A student asks; only a teacher decides. */
function CorrectionForm({ days, onClose }) {
  const mut = useDtrAction('correction');
  const [f, setF] = useState({ type: 'MISSING_TIME_OUT', date: '', timeIn: '', timeOut: '', reason: '' });
  const err = mut.error?.fields || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const meta = TYPES.find((t) => t[0] === f.type);
  const missing = days.filter((d) => d.state === 'IN_PROGRESS');
  const choices = f.type === 'MISSING_TIME_OUT' ? missing : days;

  return (
    <Modal title="Request a correction" onClose={onClose}>
      <div className="space-y-4">
        <Field label="What is wrong?">
          <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, timeIn: '', timeOut: '' })} className={`mt-1 ${inputCls}`}>
            {TYPES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>
        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs"><Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{meta[2]}</p>

        <Field label="Which day?" error={err.date}>
          <select value={f.date} onChange={set('date')} className={`mt-1 ${inputCls}`}>
            <option value="">Choose a date</option>
            {choices.map((d) => <option key={d.date} value={d.date}>{d.date}{d.state === 'IN_PROGRESS' ? ' (no time out)' : ` · ${d.hours} h`}</option>)}
          </select>
          {f.type === 'MISSING_TIME_OUT' && !missing.length && <span className="mt-1 block text-xs text-forest-700">Every day already has a time out.</span>}
        </Field>

        {f.type === 'MISSING_TIME_OUT' && (
          <Field label="What time did you actually leave?" error={err.timeOut}>
            <input type="time" value={f.timeOut} onChange={set('timeOut')} className={`mt-1 ${inputCls}`} />
          </Field>)}
        {f.type === 'CORRECTION' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Correct time in" error={err.timeIn} hint="Leave blank to keep it">
              <input type="time" value={f.timeIn} onChange={set('timeIn')} className={`mt-1 ${inputCls}`} />
            </Field>
            <Field label="Correct time out" error={err.timeOut} hint="Leave blank to keep it">
              <input type="time" value={f.timeOut} onChange={set('timeOut')} className={`mt-1 ${inputCls}`} />
            </Field>
          </div>)}

        <Field label="Explain what happened" error={err.reason} hint="Your teacher reads this before deciding. At least 10 characters.">
          <textarea rows={3} maxLength={500} value={f.reason} onChange={set('reason')} className={`mt-1 ${inputCls}`}
            placeholder="For example: my phone battery died at 4 pm, so I could not time out." />
        </Field>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending} onClick={() => mut.mutate(f, { onSuccess: onClose })} className={`${btnPrimary} flex-1`}>
            {mut.isPending ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The live DTR. It is a draft until the teacher approves it, which is said plainly at the top, printed
 * across the downloaded PDF, and the reason the only buttons here are "download" and "ask for a fix".
 */
export default function StudentDtr() {
  const { data, isLoading, error } = useMyDtr();
  const { branding } = useBranding();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <p className="text-sm">Loading your daily time record...</p>;
  if (error) return <ErrorBanner error={error} />;

  const t = data.totals, official = data.official;
  const pending = (data.corrections || []).filter((c) => c.status === 'Pending');
  const missing = (data.days || []).filter((d) => d.state === 'IN_PROGRESS');

  const download = async () => {
    setBusy(true);
    try { await exportDtr(data, branding); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My daily time record</h1>
          <p className="mt-1 text-sm text-forest-700">
            Generated from your time in and time out each day. Lunch ({data.lunch?.label}) is not counted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={download} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Download size={15} aria-hidden="true" />{busy ? 'Preparing...' : official ? 'Download DTR' : 'Download draft'}
          </button>
          <button onClick={() => setAsking(true)} className={`${btnGhost} inline-flex items-center gap-2`}>
            <AlertTriangle size={15} aria-hidden="true" />Request a correction
          </button>
        </div>
      </div>

      {/* Status: the one thing a student must not misread */}
      <div className={`mb-5 flex flex-wrap items-start gap-3 rounded-xl border p-4 ${official ? 'border-green-200 bg-green-50' : data.status === 'PENDING_TEACHER_APPROVAL' ? 'border-amber-200 bg-amber-50' : 'border-forest-100 bg-white'}`}>
        {official ? <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />
          : data.status === 'PENDING_TEACHER_APPROVAL' ? <Lock size={20} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
            : <FileText size={20} className="mt-0.5 shrink-0 text-forest-700" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <StatusTag status={data.status} />
            {official && data.approvedBy && <span className="text-sm font-normal">Approved by {data.approvedBy} on {String(data.approvedAt).slice(0, 10)}</span>}
          </p>
          <p className="mt-1.5 text-sm">
            {official
              ? 'This is your official record. It is now final and cannot change.'
              : data.status === 'PENDING_TEACHER_APPROVAL'
                ? 'You have finished your required hours. Your attendance is closed and your teacher is reviewing this record. Anything you download until then is marked DRAFT.'
                : 'This is a working draft. It updates every day you record attendance, and only your teacher can approve it.'}
          </p>
          {data.remarks && <p className="mt-2 rounded bg-white/70 p-2 text-sm"><span className="font-semibold">Teacher&rsquo;s note:</span> {data.remarks}</p>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-forest-100 bg-white p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-forest-700">Hours rendered</h2>
          <HoursProgress totals={t} />
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Period</dt><dd className="mt-1 font-semibold">{t.periodStart || '—'}</dd></div>
            <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">to</dt><dd className="mt-1 font-semibold">{t.periodEnd || '—'}</dd></div>
            <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Days rendered</dt><dd className="mt-1 font-semibold">{t.daysWorked}</dd></div>
            <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Revision</dt><dd className="mt-1 font-semibold">{data.revision || '—'}</dd></div>
          </dl>
        </section>

        <section className="rounded-xl border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">Correction requests</h2>
          {!data.corrections?.length && <p className="text-sm text-forest-700">You have not asked for any corrections.</p>}
          <ul className="space-y-3">
            {(data.corrections || []).slice(0, 6).map((c) => (
              <li key={c.id} className="border-b border-forest-100 pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{CORRECTION_META[c.type] || c.typeLabel}</p>
                  <CorrectionTag status={c.status} />
                </div>
                <p className="mt-0.5 text-xs text-forest-700">{c.date}{c.requestedTimeOut ? ` · asked for ${c.requestedTimeOut}` : ''}</p>
                {c.remarks && <p className="mt-1 text-xs">{c.reviewedBy ? `${c.reviewedBy}: ` : ''}{c.remarks}</p>}
              </li>))}
          </ul>
          {pending.length > 0 && <p className="mt-3 text-xs text-forest-700">{pending.length} request{pending.length === 1 ? '' : 's'} still waiting for your teacher.</p>}
        </section>
      </div>

      {missing.length > 0 && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">{missing.length} day{missing.length === 1 ? '' : 's'} with no time out:</span> {missing.map((d) => d.date).join(', ')}.
            Those days count as zero hours until a teacher corrects them, and your DTR cannot be approved while they are open.
          </span>
        </p>)}

      <div className="mt-8">
        <CsFormPanel />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Every day you have rendered</h2>
      <p className="mb-3 text-sm text-forest-700">Your whole immersion, across every month, with how each day was recorded.</p>
      <DtrTable days={data.days} emptyText="You have no attendance days yet. Your DTR fills in as you record attendance." />
      <SourceLegend days={data.days} />
      <p className="mt-4 text-xs text-forest-700">
        You can view and download this record at any time. Approving and releasing the official DTR is your teacher&rsquo;s decision.
      </p>

      {asking && <CorrectionForm days={data.days || []} onClose={() => setAsking(false)} />}
    </>
  );
}
