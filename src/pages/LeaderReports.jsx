import { useState } from 'react';
import StatCard from '../components/StatCard';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { Pill, day } from '../components/leaderUi';
import { useLeaderAction, useLeaderReports } from '../hooks/useLeaders';
import { useConductMeta } from '../hooks/useConduct';

function ReviewModal({ r, onClose }) {
  const mut = useLeaderAction('/leaders/report/review');
  const types = (useConductMeta().data?.types || []).filter((t) => t.kind === 'Infraction');
  const [remarks, setRemarks] = useState('');
  const [sev, setSev] = useState('');
  const open = r.status === 'Submitted';
  const f = mut.error?.fields || {};
  const send = (decision) => mut.mutate({ id: r.id, decision, remarks, infractionType: decision === 'reviewed' ? sev : '' }, { onSuccess: onClose });
  return (
    <Modal title={`${r.type} report`} onClose={onClose} wide>
      <p className="text-sm text-forest-700">{r.institutionName} - from leader {r.leaderName} - {day(r.createdAt)} <Pill text={r.status} /></p>
      {r.targetName && <p className="mt-2 text-sm"><strong>{r.type === 'Merit' ? 'Recommended student' : 'Student involved'}:</strong> {r.targetName}</p>}
      {r.severityHint && <p className="mt-1 text-sm"><strong>Leader's severity guess:</strong> {r.severityHint}</p>}
      <p className="mt-3 whitespace-pre-wrap rounded bg-forest-100/60 p-3 text-sm">{r.description}</p>
      {!open && <p className="mt-3 text-sm"><strong>Teacher remarks:</strong> {r.remarks || '-'} {r.reviewedBy && `(${r.reviewedBy})`}{r.infractionId && ' - an infraction was recorded.'}</p>}
      {open && <div className="mt-4 space-y-3">
        {r.type === 'Incident' && r.targetId && (
          <Field label="Record an infraction for this student?"><select value={sev} onChange={(e) => setSev(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">No infraction</option>{types.map((x) => <option key={x.typeId} value={x.typeId}>{x.category} - {x.name} ({x.points} pts)</option>)}</select></Field>)}
        <Field label="Remarks" error={f.remarks} hint="Required to dismiss (at least 5 characters)."><textarea rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} /></Field>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        {f.infractionType && <p role="alert" className="text-sm text-red-700">{f.infractionType}</p>}
        <div className="flex gap-3"><button className={`flex-1 ${btnGhost}`} disabled={mut.isPending} onClick={() => send('dismissed')}>Dismiss</button>
          <button className={`flex-1 ${btnPrimary}`} disabled={mut.isPending} onClick={() => send('reviewed')}>{r.type === 'Merit' ? 'Accept recommendation' : 'Mark as reviewed'}</button></div>
      </div>}
    </Modal>
  );
}

export default function LeaderReports() {
  const t = useTableState({ status: 'Submitted', type: '', institutionId: '' }, { key: 'date', dir: 'desc' });
  const [open, setOpen] = useState(null);
  const q = useLeaderReports({ ...t.params, pageSize: 10 });
  const d = q.data;
  const filters = [
    { key: 'status', label: 'Status', anyLabel: 'All statuses', options: [{ value: 'Submitted', label: 'Awaiting review' }, { value: 'All', label: 'All' }, { value: 'Reviewed', label: 'Reviewed' }, { value: 'Dismissed', label: 'Dismissed' }] },
    { key: 'type', label: 'Report type', options: ['Observation', 'Incident', 'Merit'].map((x) => ({ value: x, label: x })) },
    { key: 'institutionId', label: 'Institution', options: (d?.institutions || []).map((i) => ({ value: i.id, label: i.name })) }
  ];
  const columns = [
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (r) => day(r.createdAt), render: (r) => day(r.createdAt) },
    { key: 'type', header: 'Type', sortable: true, value: (r) => r.type, render: (r) => <Pill text={r.type} /> },
    { key: 'institution', header: 'Institution', sortable: true, value: (r) => r.institutionName, render: (r) => r.institutionName },
    { key: 'leader', header: 'Leader', sortable: true, value: (r) => r.leaderName, render: (r) => r.leaderName },
    { key: 'about', header: 'About', value: (r) => r.targetName || r.description, render: (r) => r.targetName || `${r.description.slice(0, 60)}...` },
    { key: 'status', header: 'Status', sortable: true, value: (r) => r.status, render: (r) => <Pill text={r.status} /> }
  ];
  return (
    <>
      <PageHeader title="Leader reports" />
      <div className="mb-4 grid gap-4 sm:grid-cols-3"><StatCard label="Awaiting review" value={d?.counts.submitted} /><StatCard label="Reviewed" value={d?.counts.reviewed} /><StatCard label="Dismissed" value={d?.counts.dismissed} /></div>
      <FilterBar searchPlaceholder="Search reports..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('leader-reports', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} sort={t.sort} onSort={t.onSort} caption="Student leader reports"
        empty={{ title: 'No reports found', body: 'Observations, incident reports and merit recommendations from student leaders appear here.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="report"
        rowActions={(r) => <button className="font-semibold text-amber-600 underline" onClick={() => setOpen(r)}>{r.status === 'Submitted' ? 'Review' : 'View'}</button>} />
      {open && <ReviewModal r={open} onClose={() => setOpen(null)} />}
    </>
  );
}
