import { Link } from 'react-router-dom';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { Tag } from '../components/supervisorUi';
import { useSupStudents } from '../hooks/useSupervisor';

export default function SupervisorStudents() {
  const t = useTableState({ filter: '' }, { key: 'name', dir: 'asc' });
  const query = useSupStudents({ ...t.params, pageSize: 10 });
  const d = query.data;
  const filters = [{ key: 'filter', label: 'Show', anyLabel: 'All students',
    options: [{ value: 'pending', label: 'Attendance to verify' }, { value: 'unevaluated', label: 'Not yet evaluated' }] }];
  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (s) => s.name, render: (s) => <><span className="font-medium">{s.name}</span><span className="block text-xs text-forest-700">{s.studentId}</span></> },
    { key: 'class', header: 'Class', nowrap: true, value: (s) => `${s.gradeLevel} ${s.strand} - ${s.section}`, render: (s) => `${s.gradeLevel} ${s.strand} - ${s.section}` },
    { key: 'hours', header: 'Hours', sortable: true, align: 'right', value: (s) => (s.hasAccount ? `${s.hours}/${s.requiredHours}` : ''), render: (s) => (s.hasAccount ? `${s.hours} / ${s.requiredHours}` : '-') },
    { key: 'attendance', header: 'Attendance', sortable: true, align: 'right', value: (s) => s.attendanceRate, render: (s) => (s.attendanceRate != null ? `${s.attendanceRate}%` : '-') },
    { key: 'pending', header: 'To verify', sortable: true, align: 'right', value: (s) => s.pendingVerification, render: (s) => s.pendingVerification || '-' },
    { key: 'evaluations', header: 'Evaluation', sortable: true, value: (s) => s.evaluationsSubmitted,
      render: (s) => <>{s.evaluationsSubmitted ? <span>{s.evaluationsSubmitted} submitted, last {s.latestAverage}/5</span> : <Tag text="Not evaluated" />}{s.hasDraft && <span className="ml-2"><Tag text="Draft" /></span>}</> }
  ];
  return (
    <>
      <PageHeader title="Assigned students" />
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('assigned-students', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} getRowId={(s) => s.studentId} loading={query.isLoading} error={query.error}
        sort={t.sort} onSort={t.onSort} caption="Students at my institutions"
        empty={{ title: 'No students found', body: t.search || t.filters.filter ? 'Nothing matches this search or filter.' : 'No students are assigned to your institution yet.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="student"
        rowActions={(s) => <Link className="font-semibold text-amber-600 underline" to={`/supervisor/students/${s.studentId}`}>Open</Link>} />
    </>
  );
}
