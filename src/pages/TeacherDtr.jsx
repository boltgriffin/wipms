import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Download, Printer, RefreshCw } from 'lucide-react';
import {
  DataTable, EmptyState, FilterBar, LoadingState, PageHeader, Pagination,
  btnGhost, btnPrimary, columnsToCsv, exportCsv, inputCls, useTableState
} from '../components/datatable';
import { ErrorBanner, Field, Modal } from '../components/ui';
import { CORRECTION_META, CorrectionTag, DtrTable, HoursProgress, ProgressBar, SourceLegend, StatusTag } from '../components/dtrUi';
import CsFormPanel from '../components/CsFormPanel';
import { useCorrections, useDtrAction, useDtrOverview, useStudentDtr } from '../hooks/useDtr';
import { useBranding } from '../hooks/useShell';
import { exportDtr, printDtr } from '../export/dtrPdf';

const PAGE = 10;
const STATUS_FILTER = [
  { key: 'status', label: 'DTR status', type: 'select', options: [
    { value: '', label: 'All' }, { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_TEACHER_APPROVAL', label: 'Pending approval' }, { value: 'APPROVED', label: 'Approved' }
  ] }
];

/* ---------- One correction request, decided ---------- */
function ReviewForm({ item, onClose }) {
  const mut = useDtrAction('review');
  const [decision, setDecision] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const err = mut.error?.fields || {};
  return (
    <Modal title={`${CORRECTION_META[item.type] || item.typeLabel} — ${item.student}`} onClose={onClose}>
      <dl className="divide-y divide-forest-100 text-sm">
        <div className="flex justify-between gap-4 py-2"><dt className="text-forest-700">Date</dt><dd className="font-medium">{item.date}</dd></div>
        {item.requestedTimeIn && <div className="flex justify-between gap-4 py-2"><dt className="text-forest-700">Asked for time in</dt><dd className="font-medium">{item.requestedTimeIn}</dd></div>}
        {item.requestedTimeOut && <div className="flex justify-between gap-4 py-2"><dt className="text-forest-700">Asked for time out</dt><dd className="font-medium">{item.requestedTimeOut}</dd></div>}
        <div className="py-2"><dt className="text-forest-700">The student says</dt><dd className="mt-1">{item.reason}</dd></div>
      </dl>

      <div className="mt-4 space-y-3">
        <Field label="Decision">
          <select value={decision} onChange={(e) => setDecision(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="approve">Approve and write the time</option>
            <option value="reject">Reject</option>
          </select>
        </Field>
        <Field label={decision === 'reject' ? 'Why are you rejecting it?' : 'Remarks (optional)'} error={err.remarks}>
          <textarea rows={2} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} />
        </Field>
        {decision === 'approve' && <p className="rounded-lg bg-blue-50 p-3 text-xs">Approving writes the requested time and recalculates that day&rsquo;s hours straight away.</p>}
      </div>
      <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
      <div className="mt-4 flex gap-3">
        <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
        <button disabled={mut.isPending} onClick={() => mut.mutate({ id: item.id, decision, remarks }, { onSuccess: onClose })} className={`${btnPrimary} flex-1`}>
          {mut.isPending ? 'Saving...' : decision === 'approve' ? 'Approve' : 'Reject'}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- One student's DTR, reviewed ---------- */
function StudentPanel({ studentId, onClose }) {
  const { data, isLoading, error } = useStudentDtr(studentId);
  const { branding } = useBranding();
  const approve = useDtrAction('approve');
  const regen = useDtrAction('regenerate');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const [review, setReview] = useState(null);

  const act = async (kind) => {
    setBusy(kind);
    try { await (kind === 'print' ? printDtr(data, branding) : exportDtr(data, branding)); } finally { setBusy(''); }
  };

  return (
    <Modal wide title={isLoading ? 'Loading...' : `Daily time record — ${data?.student?.name || ''}`} onClose={onClose}>
      {isLoading && <LoadingState />}
      {error && <ErrorBanner error={error} />}
      {data && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusTag status={data.status} />
            <div className="flex flex-wrap gap-2">
              <button disabled={!!busy} onClick={() => act('download')} className={`${btnGhost} inline-flex items-center gap-2`}><Download size={15} aria-hidden="true" />Download</button>
              <button disabled={!!busy} onClick={() => act('print')} className={`${btnGhost} inline-flex items-center gap-2`}><Printer size={15} aria-hidden="true" />Print</button>
            </div>
          </div>

          <section className="rounded-xl bg-paper p-4">
            <HoursProgress totals={data.totals} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-forest-700">Institution</dt><dd className="mt-0.5 font-semibold">{data.student.institution || '—'}</dd></div>
              <div><dt className="text-xs text-forest-700">Period</dt><dd className="mt-0.5 font-semibold">{data.totals.periodStart || '—'} to {data.totals.periodEnd || '—'}</dd></div>
              <div><dt className="text-xs text-forest-700">Lunch not counted</dt><dd className="mt-0.5 font-semibold">{data.lunch?.label}</dd></div>
              <div><dt className="text-xs text-forest-700">Revision</dt><dd className="mt-0.5 font-semibold">{data.revision || '—'}</dd></div>
            </dl>
          </section>

          {/* Everything that stands between this record and an approval */}
          {(data.openCorrections > 0 || data.missingTimeOut?.length > 0) && (
            <div role="alert" className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm">
              {data.openCorrections > 0 && <p className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{data.openCorrections} correction request{data.openCorrections === 1 ? '' : 's'} still waiting for your decision.</p>}
              {data.missingTimeOut?.length > 0 && <p className="flex items-start gap-2"><Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />No time out on {data.missingTimeOut.join(', ')}. Those days count as zero hours.</p>}
            </div>)}

          {data.corrections?.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-forest-700">Correction requests</h3>
              <ul className="space-y-2">
                {data.corrections.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-forest-100 p-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{CORRECTION_META[c.type] || c.typeLabel} <span className="font-normal text-forest-700">· {c.date}</span></p>
                      <p className="mt-0.5 text-xs">{c.reason}</p>
                      {c.remarks && <p className="mt-1 text-xs text-forest-700">Your note: {c.remarks}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <CorrectionTag status={c.status} />
                      {c.status === 'Pending' && <button onClick={() => setReview(c)} className={btnGhost}>Decide</button>}
                    </div>
                  </li>))}
              </ul>
            </section>)}

          {/* The form the school actually files, month by month */}
          <CsFormPanel studentId={studentId} canPrint />

          <section>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-forest-700">Every day rendered</h3>
            <p className="mb-2 text-xs text-forest-700">The whole immersion across every month, with how each day was captured.</p>
            <DtrTable days={data.days} />
            <SourceLegend days={data.days} />
          </section>

          {/* Approve, or reissue */}
          {data.status !== 'APPROVED' ? (
            <section className="rounded-xl border border-forest-100 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-forest-700">Approve and release the official DTR</h3>
              <p className="mt-1 text-sm text-forest-700">
                {data.canApprove
                  ? 'Approving freezes this record, writes the official DTR and locks the attendance rows behind it.'
                  : `This student has rendered ${data.totals.totalHours} of ${data.totals.requiredHours} hours. You can approve once the required hours are complete.`}
              </p>
              <div className="mt-3">
                <Field label="Remarks on the record (optional)">
                  <input value={remarks} maxLength={500} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} />
                </Field>
              </div>
              <ErrorBanner error={approve.error} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={!data.canApprove || approve.isPending} onClick={() => approve.mutate({ studentId, remarks })}
                  className={`${btnPrimary} inline-flex items-center gap-2`}>
                  <CheckCircle2 size={15} aria-hidden="true" />{approve.isPending ? 'Approving...' : 'Approve DTR'}
                </button>
                <button disabled={regen.isPending} onClick={() => regen.mutate({ studentId })} className={`${btnGhost} inline-flex items-center gap-2`}>
                  <RefreshCw size={15} aria-hidden="true" />{regen.isPending ? 'Rebuilding...' : 'Regenerate from attendance'}
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="flex items-start gap-2 text-sm text-green-900">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Approved{data.approvedBy ? ` by ${data.approvedBy}` : ''} on {String(data.approvedAt).slice(0, 10)}.</span>{' '}
                  The record is frozen; a later change to an attendance row no longer moves it.
                  {data.remarks ? ` Remarks: ${data.remarks}` : ''}
                </span>
              </p>
              <div className="mt-3">
                <Field label="Reissue this DTR" error={regen.error?.fields?.reason} hint="Reopens it for a fresh decision. Say why, for the audit log.">
                  <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputCls}`} placeholder="For example: the supervisor corrected the final day" />
                </Field>
              </div>
              <ErrorBanner error={regen.error && !regen.error.fields ? regen.error : null} />
              <button disabled={regen.isPending} onClick={() => regen.mutate({ studentId, reason })} className={`${btnGhost} mt-3 inline-flex items-center gap-2`}>
                <RefreshCw size={15} aria-hidden="true" />{regen.isPending ? 'Reissuing...' : 'Regenerate DTR'}
              </button>
            </section>
          )}
        </div>)}
      {review && <ReviewForm item={review} onClose={() => setReview(null)} />}
    </Modal>
  );
}

/* ---------- The teacher's queue ---------- */
export default function TeacherDtr() {
  const t = useTableState({ status: '' }, { key: 'name', dir: 'asc' });
  const { data, isLoading, error } = useDtrOverview(t.params);
  const corrections = useCorrections({ status: 'Pending' });
  const [open, setOpen] = useState(null);
  const [review, setReview] = useState(null);

  const rows = useMemo(() => {
    const all = data?.items || [];
    const q = t.search.toLowerCase();
    return q ? all.filter((x) => `${x.name} ${x.institution}`.toLowerCase().includes(q)) : all;
  }, [data, t.search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(t.page, pages);
  const view = rows.slice((page - 1) * PAGE, page * PAGE);

  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (r) => r.name,
      render: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs text-forest-700">{r.institution || 'No institution'}</span></> },
    { key: 'hours', header: 'Hours', sortable: true, nowrap: true, value: (r) => `${r.totalHours}/${r.requiredHours}`,
      render: (r) => <span className="font-semibold">{r.totalHours}<span className="font-normal text-forest-700"> / {r.requiredHours}</span></span> },
    { key: 'completion', header: 'Completion', sortable: true, value: (r) => r.completionPct,
      render: (r) => <div className="min-w-[110px]"><ProgressBar pct={r.completionPct} /><span className="mt-1 block text-xs text-forest-700">{r.completionPct}%</span></div> },
    { key: 'status', header: 'DTR', sortable: true, nowrap: true, value: (r) => r.dtrStatus, render: (r) => <StatusTag status={r.dtrStatus} /> },
    { key: 'corrections', header: 'Needs attention', sortable: true, value: (r) => r.openCorrections + r.missingTimeOut,
      render: (r) => (r.openCorrections || r.missingTimeOut)
        ? <span className="text-xs">{r.openCorrections ? `${r.openCorrections} correction${r.openCorrections === 1 ? '' : 's'}` : ''}{r.openCorrections && r.missingTimeOut ? ', ' : ''}{r.missingTimeOut ? `${r.missingTimeOut} missing time out` : ''}</span>
        : <span className="text-xs text-forest-700">—</span> }
  ];
  const counts = data?.counts || {};

  return (
    <>
      <PageHeader title="Daily time records"
        subtitle="Each student's DTR is generated from their time in and time out. Review it, settle any corrections, then approve to release the official copy." />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[['Pending approval', counts.pending || 0, 'bg-amber-50'], ['Approved', counts.approved || 0, 'bg-green-50'],
          ['Still in progress', counts.draft || 0, 'bg-paper'], ['Corrections waiting', data?.pendingCorrections || 0, 'bg-blue-50']].map(([label, n, tone]) => (
          <div key={label} className={`rounded-xl border border-forest-100 p-4 ${tone}`}>
            <p className="text-xs font-medium text-forest-700">{label}</p>
            <p className="mt-1 text-2xl font-bold">{n}</p>
          </div>))}
      </div>

      {corrections.data?.items?.length > 0 && (
        <section className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">Correction requests waiting</h2>
          <ul className="mt-3 space-y-2">
            {corrections.data.items.slice(0, 5).map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-white p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{c.student} <span className="font-normal text-forest-700">&middot; {CORRECTION_META[c.type] || c.typeLabel} &middot; {c.date}</span></p>
                  <p className="mt-0.5 text-xs">{c.reason}</p>
                </div>
                <button onClick={() => setReview(c)} className={btnPrimary}>Decide</button>
              </li>))}
          </ul>
          {corrections.data.items.length > 5 && <p className="mt-2 text-xs">{corrections.data.items.length - 5} more waiting.</p>}
        </section>)}

      <FilterBar searchPlaceholder="Search student or institution..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={STATUS_FILTER} values={t.filters} onApply={t.setFilters} onReset={t.reset}
        onExport={() => exportCsv('wipms-dtr-overview', columnsToCsv(columns), rows)} />

      {isLoading ? <LoadingState label="Loading daily time records..." />
        : !rows.length ? <EmptyState title="No students to show" body="Nothing matches the current search and filter." action={<button onClick={t.reset} className={btnGhost}>Reset</button>} />
          : (
            <>
              <DataTable columns={columns} rows={view} getRowId={(r) => r.studentId} error={error} sort={t.sort} onSort={t.onSort}
                caption="Students and the state of their daily time record"
                rowActions={(r) => [<button key="open" onClick={() => setOpen(r.studentId)} className={btnGhost}>Review DTR</button>]} />
              <Pagination page={page} pages={pages} total={rows.length} onPage={t.setPage} unit="student" />
            </>)}

      <p className="mt-4 text-xs text-forest-700">
        Students can view and download a draft of their own record at any time. Approving is yours alone, and it locks the attendance rows behind the record.
      </p>

      {open && <StudentPanel studentId={open} onClose={() => setOpen(null)} />}
      {review && <ReviewForm item={review} onClose={() => setReview(null)} />}
    </>
  );
}
