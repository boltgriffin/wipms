import { useState } from 'react';
import { EvaluationCard, Tag } from '../components/supervisorUi';
import { Modal } from '../components/ui';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useSupEvaluations } from '../hooks/useSupervisor';

export default function SupervisorEvaluations() {
  const t = useTableState({ status: '', type: '', studentId: '' }, { key: 'date', dir: 'desc' });
  const [view, setView] = useState(null);
  const query = useSupEvaluations({ ...t.params, pageSize: 10 });
  const d = query.data;
  const filters = [
    { key: 'studentId', label: 'Student', options: (d?.students || []).map((s) => ({ value: s.id, label: s.name })) },
    { key: 'status', label: 'Status', anyLabel: 'All statuses', options: [{ value: 'Draft', label: 'Draft' }, { value: 'Submitted', label: 'Submitted' }] },
    { key: 'type', label: 'Evaluation type', options: ['Midterm', 'Final', 'Periodic'].map((x) => ({ value: x, label: x })) }
  ];
  const columns = [
    { key: 'student', header: 'Student', sortable: true, value: (e) => e.studentName, render: (e) => <span className="font-medium">{e.studentName}</span> },
    { key: 'type', header: 'Type', sortable: true, value: (e) => e.type, render: (e) => e.type },
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (e) => e.date, render: (e) => e.date },
    { key: 'average', header: 'Average', sortable: true, align: 'right', value: (e) => e.average, render: (e) => (e.average != null ? `${e.average} / 5` : '-') },
    { key: 'rating', header: 'Rating', value: (e) => e.rating, render: (e) => (e.rating ? <Tag text={e.rating} /> : '-') },
    { key: 'status', header: 'Status', sortable: true, value: (e) => e.status, render: (e) => <Tag text={e.status} /> },
    { key: 'by', header: 'By', value: (e) => (e.mine ? 'You' : e.supervisorName), render: (e) => (e.mine ? 'You' : e.supervisorName) }
  ];
  return (
    <>
      <PageHeader title="Evaluation history" />
      <FilterBar searchPlaceholder="Search evaluations..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('evaluations', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={query.isLoading} error={query.error} sort={t.sort} onSort={t.onSort} caption="Evaluations"
        empty={{ title: 'No evaluations found', body: 'Nothing matches this search or filter.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="evaluation"
        rowActions={(e) => <button className="font-semibold text-amber-600 underline" onClick={() => setView(e)}>View</button>} />
      {view && <Modal title={view.studentName} onClose={() => setView(null)} wide><EvaluationCard e={view} /></Modal>}
    </>
  );
}
