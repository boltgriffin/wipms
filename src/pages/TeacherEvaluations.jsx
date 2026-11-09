import { useState } from 'react';
import { EvaluationCard, EvaluationSummary, FeedbackList, Tag } from '../components/supervisorUi';
import { ErrorBanner, Modal } from '../components/ui';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useEvalStudent, useEvalStudents } from '../hooks/useSupervisor';

function Detail({ id, onClose }) {
  const { data: d, error, isLoading } = useEvalStudent(id);
  return (
    <Modal title={d?.name || 'Student evaluation'} onClose={onClose} wide>
      {isLoading && <p className="text-sm">Loading...</p>}<ErrorBanner error={error} />
      {d && <>
        <h3 className="mb-2 text-sm font-bold">Evaluation summary</h3><EvaluationSummary s={d.summary} />
        <h3 className="mb-2 mt-6 text-sm font-bold">Submitted evaluations</h3>
        <div className="space-y-3">{d.evaluations.map((e) => <EvaluationCard key={e.id} e={e} />)}{!d.evaluations.length && <p className="text-sm text-forest-700">None yet.</p>}</div>
        <h3 className="mb-2 mt-6 text-sm font-bold">Supervisor feedback</h3><FeedbackList items={d.feedback} />
      </>}
    </Modal>
  );
}

export default function TeacherEvaluations() {
  const { data, error, isLoading } = useEvalStudents();
  const t = useTableState({ evaluated: '' }, { key: 'name', dir: 'asc' });
  const [open, setOpen] = useState(null);
  const dir = t.sort?.dir === 'desc' ? -1 : 1;
  const keyOf = { name: (s) => s.name, institution: (s) => s.institutionName, count: (s) => s.count, average: (s) => s.average ?? -1 };
  const rows = (data?.students || [])
    .filter((s) => (!t.search || (s.name + s.studentId).toLowerCase().includes(t.search.toLowerCase()))
      && (t.filters.evaluated !== 'yes' || s.count > 0) && (t.filters.evaluated !== 'no' || s.count === 0))
    .slice().sort((a, b) => { const f = keyOf[t.sort?.key || 'name']; const x = f(a), y = f(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; });
  const filters = [{ key: 'evaluated', label: 'Evaluation state', anyLabel: 'All students',
    options: [{ value: 'yes', label: 'Has evaluations' }, { value: 'no', label: 'Not evaluated yet' }] }];
  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (s) => s.name, render: (s) => <><span className="font-medium">{s.name}</span><span className="block text-xs text-forest-700">{s.gradeLevel} {s.strand} - {s.section}</span></> },
    { key: 'institution', header: 'Institution', sortable: true, value: (s) => s.institutionName, render: (s) => s.institutionName || 'Unassigned' },
    { key: 'count', header: 'Evaluations', sortable: true, align: 'right', value: (s) => s.count, render: (s) => s.count },
    { key: 'average', header: 'Average', sortable: true, value: (s) => s.average, render: (s) => (s.average != null ? `${s.average} / 5` : '-') },
    { key: 'rating', header: 'Rating', value: (s) => s.rating, render: (s) => (s.rating ? <Tag text={s.rating} /> : '-') }
  ];
  return (
    <>
      <PageHeader title="Student evaluations" />
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('student-evaluations', columnsToCsv(columns), rows)} />
      <DataTable columns={columns} rows={rows} getRowId={(s) => s.studentId} loading={isLoading} error={error} sort={t.sort} onSort={t.onSort} caption="Student evaluations"
        empty={{ title: 'No students found', body: 'Nothing matches this search or filter.' }}
        rowActions={(s) => <button className="font-semibold text-amber-600 underline" onClick={() => setOpen(s.studentId)}>View</button>} />
      {open && <Detail id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
