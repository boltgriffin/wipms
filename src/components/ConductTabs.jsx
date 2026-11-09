import { useState } from 'react';
import StatCard from './StatCard';
import { ConfirmDialog, ErrorBanner, Field, Modal } from './ui';
import { DataTable, FilterBar, btnGhost, btnPrimary, columnsToCsv, exportCsv, inputCls, useTableState } from './datatable';
import { ConductBadge, dayOf, pts } from './conductUi';
import { useConductAction, useConductQueue, useConductRecords, useConductReport } from '../hooks/useConduct';

function ReviewModal({ r, onClose }) {
  const mut = useConductAction('/conduct/review');
  const [remarks, setRemarks] = useState('');
  const [points, setPoints] = useState(r.points);
  const f = mut.error?.fields || {};
  const send = (decision) => mut.mutate({ id: r.id, decision, remarks, points: r.kind === 'Merit' ? Number(points) : undefined }, { onSuccess: onClose });
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
  return (
    <Modal title={`Review ${r.kind.toLowerCase()}`} onClose={onClose}>
      <dl className="divide-y divide-forest-100">
        <Row k="Student" v={r.studentName} /><Row k="Type" v={`${r.category === 'Merit' ? '' : r.category + ' - '}${r.typeName}`} /><Row k="Points" v={pts(r.submittedPoints)} />
        <Row k="Date" v={r.date} /><Row k="Submitted by" v={`${r.submittedBy} (${r.submitterRole.replace('_', ' ').toLowerCase()})`} />
      </dl>
      <p className="mt-3 whitespace-pre-wrap rounded bg-forest-100/60 p-3 text-sm">{r.description}</p>
      <div className="mt-4 space-y-3">
        {r.kind === 'Merit' && <Field label="Approved points" error={f.points} hint="You may adjust the submitted points (1 to 5)."><select value={points} onChange={(e) => setPoints(e.target.value)} className={`mt-1 ${inputCls}`}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>+{n}</option>)}</select></Field>}
        {r.major && <p className="rounded bg-red-50 p-3 text-xs text-red-700">This is a major infraction. Approving it blocks the student from being chosen as leader and ends their term if they are the current leader.</p>}
        <Field label="Remarks" error={f.remarks} hint="Required to reject (at least 5 characters)."><textarea rows={3} maxLength={300} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} /></Field>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3"><button className={`flex-1 ${btnGhost}`} disabled={mut.isPending} onClick={() => send('reject')}>Reject</button>
          <button className={`flex-1 ${btnPrimary}`} disabled={mut.isPending} onClick={() => send('approve')}>Approve</button></div>
      </div>
    </Modal>
  );
}

export function QueueTab() {
  const t = useTableState({ kind: '' }, { key: 'date', dir: 'desc' });
  const [open, setOpen] = useState(null);
  const q = useConductQueue({ ...t.params, pageSize: 10 });
  const d = q.data;
  const filters = [{ key: 'kind', label: 'Record type', anyLabel: 'Merits and infractions', options: [{ value: 'Merit', label: 'Merit' }, { value: 'Infraction', label: 'Infraction' }] }];
  const columns = [
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (r) => r.date, render: (r) => r.date },
    { key: 'student', header: 'Student', sortable: true, value: (r) => r.studentName, render: (r) => <span className="font-medium">{r.studentName}</span> },
    { key: 'kind', header: 'Type', sortable: true, value: (r) => `${r.kind} - ${r.typeName}`, render: (r) => <><ConductBadge text={r.kind} /> {r.typeName}</> },
    { key: 'points', header: 'Points', sortable: true, align: 'right', value: (r) => r.points, render: (r) => pts(r.points) },
    { key: 'by', header: 'Submitted by', value: (r) => r.submittedBy, render: (r) => <>{r.submittedBy}<span className="block text-xs text-forest-700">{r.submitterRole.replace('_', ' ').toLowerCase()}</span></> }
  ];
  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3"><StatCard label="Awaiting review" value={d?.counts.pending} /><StatCard label="Merits" value={d?.counts.merits} /><StatCard label="Infractions" value={d?.counts.infractions} /></div>
      <FilterBar searchPlaceholder="Search the queue..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('conduct-queue', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} sort={t.sort} onSort={t.onSort} caption="Conduct review queue"
        empty={{ title: 'Nothing is waiting for review', body: 'Merits and infractions submitted by teachers or student leaders appear here.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="record"
        rowActions={(r) => <button className="font-semibold text-amber-600 underline" onClick={() => setOpen(r)}>Review</button>} />
      {open && <ReviewModal r={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function RecordsTab() {
  const t = useTableState({ status: '', kind: '', category: '', studentId: '', from: '', to: '' }, { key: 'date', dir: 'desc' });
  const [res, setRes] = useState(null);
  const q = useConductRecords({ ...t.params, pageSize: 10 });
  const resolve = useConductAction('/conduct/resolve');
  const d = q.data;
  const filters = [
    { key: 'studentId', label: 'Student', options: (d?.students || []).map((s) => ({ value: s.id, label: s.name })) },
    { key: 'status', label: 'Status', anyLabel: 'Any status', options: ['Pending', 'Approved', 'Rejected'].map((x) => ({ value: x, label: x })) },
    { key: 'kind', label: 'Record type', anyLabel: 'Merits and infractions', options: [{ value: 'Merit', label: 'Merit' }, { value: 'Infraction', label: 'Infraction' }] },
    { key: 'category', label: 'Category', options: (d?.categories || []).map((c) => ({ value: c, label: c })) },
    { key: 'from', label: 'From date', type: 'date' }, { key: 'to', label: 'To date', type: 'date' }
  ];
  const columns = [
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (r) => r.date, render: (r) => r.date },
    { key: 'student', header: 'Student', sortable: true, value: (r) => r.studentName, render: (r) => <span className="font-medium">{r.studentName}</span> },
    { key: 'type', header: 'Type', sortable: true, value: (r) => `${r.kind} - ${r.typeName}`, render: (r) => <><ConductBadge text={r.kind} /> {r.typeName}</> },
    { key: 'points', header: 'Points', sortable: true, align: 'right', value: (r) => r.points, render: (r) => pts(r.points) },
    { key: 'description', header: 'Description', value: (r) => r.description, render: (r) => <>{r.description}<span className="block text-xs text-forest-700">By {r.submittedBy}</span></> },
    { key: 'status', header: 'Status', sortable: true, value: (r) => r.status,
      render: (r) => <><ConductBadge text={r.status} />{r.reviewedBy && <span className="block text-xs text-forest-700">{r.reviewedBy}, {dayOf(r.reviewedAt)}</span>}
        {r.major && r.status === 'Approved' && <span className="block text-xs text-forest-700">{r.resolvedAt ? `Resolved ${dayOf(r.resolvedAt)}` : 'Major, still active'}</span>}</> }
  ];
  return (
    <>
      <FilterBar searchPlaceholder="Search records..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('conduct-records', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} sort={t.sort} onSort={t.onSort} caption="Merit and infraction records"
        empty={{ title: 'No records found', body: 'Nothing matches this search or filter.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="record"
        rowActions={(r) => (r.canResolve ? <button className="font-semibold text-amber-600 underline" onClick={() => { resolve.reset(); setRes(r); }}>Resolve</button> : <span className="text-xs text-forest-700">-</span>)} />
      {res && <ConfirmDialog title="Resolve major infraction?" confirmLabel="Resolve" busy={resolve.isPending} error={resolve.error} onCancel={() => setRes(null)}
        text={`Resolving lifts ${res.studentName}'s leader disqualification. The points stay in their conduct score.`} onConfirm={() => resolve.mutate({ id: res.id }, { onSuccess: () => setRes(null) })} />}
    </>
  );
}

export function ScoresTab() {
  const t = useTableState({ from: '', to: '', institutionId: '' }, { key: 'name', dir: 'asc' });
  const q = useConductReport(t.filters);
  const d = q.data;
  const filters = [
    { key: 'institutionId', label: 'Institution', options: (d?.institutions || []).map((i) => ({ value: i.id, label: i.name })) },
    { key: 'from', label: 'From date', type: 'date' }, { key: 'to', label: 'To date', type: 'date' }
  ];
  const cat = (c) => ({ key: c.toLowerCase(), header: c, align: 'right', value: (r) => r.byCat[c], render: (r) => (r.byCat[c] ? `-${r.byCat[c]}` : '-') });
  const columns = [
    { key: 'name', header: 'Student', value: (r) => r.name, render: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs text-forest-700">{r.institutionName || 'Unassigned'}</span></> },
    { key: 'class', header: 'Class', nowrap: true, value: (r) => `${r.gradeLevel} ${r.strand} - ${r.section}`, render: (r) => `${r.gradeLevel} ${r.strand} - ${r.section}` },
    cat('Attendance'), cat('Uniform'), cat('Safety'), cat('Behavior'),
    { key: 'merits', header: 'Merits', align: 'right', value: (r) => r.merits, render: (r) => (r.merits ? `+${r.merits}` : '-') },
    { key: 'score', header: 'Score', align: 'right', value: (r) => r.score, render: (r) => <span className="text-base font-bold">{r.score}</span> },
    { key: 'pending', header: 'Pending', align: 'right', value: (r) => r.pending, render: (r) => r.pending || '-' }
  ];
  return (
    <>
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('conduct-scores', columnsToCsv(columns), d?.rows || [])} />
      {(t.filters.from || t.filters.to) && <p className="mb-3 text-xs text-forest-700">Scores use only records dated in this period, each starting from 100.</p>}
      {d && <div className="mb-4 grid gap-4 sm:grid-cols-4"><StatCard label="Students" value={d.totals.students} /><StatCard label="Average conduct score" value={d.totals.avgScore ?? '-'} />
        <StatCard label="Merit points" value={`+${d.totals.merits}`} /><StatCard label="Infraction points" value={`-${d.totals.infractions}`} /></div>}
      <DataTable columns={columns} rows={(d?.rows || []).filter((r) => !t.search || r.name.toLowerCase().includes(t.search.toLowerCase()))} getRowId={(r) => r.studentId}
        loading={q.isLoading} error={q.error} caption="Conduct scores" empty={{ title: 'No students found', body: 'Nothing matches this search or filter.' }} />
      {d?.byType.length > 0 && (<>
        <h3 className="mb-2 mt-6 text-lg font-bold">Approved records by type</h3>
        <DataTable caption="Approved records by type" getRowId={(x) => x.typeName} rows={d.byType}
          columns={[{ key: 'typeName', header: 'Type', render: (x) => x.typeName }, { key: 'kind', header: 'Kind', render: (x) => <ConductBadge text={x.kind} /> },
            { key: 'count', header: 'Count', align: 'right', render: (x) => x.count }, { key: 'points', header: 'Points', align: 'right', render: (x) => pts(x.points) }]} /></>)}
    </>
  );
}
