import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/attendanceUi';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useAttendanceStore } from '../store/attendanceStore';
import { useEffect } from 'react';

export default function TeacherAttendance() {
  const { students, loadStudents, error } = useAttendanceStore();
  const t = useTableState({ progress: '' }, { key: 'name', dir: 'asc' });
  useEffect(() => { loadStudents(); }, [loadStudents]);
  const all = students?.students || [];
  const dir = t.sort?.dir === 'desc' ? -1 : 1;
  const keyOf = { name: (s) => s.name, required: (s) => s.summary.requiredHours, rendered: (s) => s.summary.totalHours,
    remaining: (s) => s.summary.remainingHours, completion: (s) => s.summary.completionPct, rate: (s) => s.summary.attendanceRate ?? -1 };
  const rows = all
    .filter((s) => (!t.search || s.name.toLowerCase().includes(t.search.toLowerCase()))
      && (t.filters.progress !== 'done' || s.summary.completionPct >= 100)
      && (t.filters.progress !== 'behind' || s.summary.completionPct < 50)
      && (t.filters.progress !== 'nostart' || s.summary.totalHours === 0))
    .slice().sort((a, b) => { const f = keyOf[t.sort?.key || 'name']; const x = f(a), y = f(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; });
  const filters = [{ key: 'progress', label: 'Progress', anyLabel: 'All students',
    options: [{ value: 'done', label: 'Finished required hours' }, { value: 'behind', label: 'Under half done' }, { value: 'nostart', label: 'No hours yet' }] }];
  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (s) => s.name, render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'required', header: 'Required', sortable: true, align: 'right', value: (s) => s.summary.requiredHours, render: (s) => s.summary.requiredHours },
    { key: 'rendered', header: 'Rendered', sortable: true, align: 'right', value: (s) => s.summary.totalHours, render: (s) => s.summary.totalHours },
    { key: 'remaining', header: 'Remaining', sortable: true, align: 'right', value: (s) => s.summary.remainingHours, render: (s) => s.summary.remainingHours },
    { key: 'completion', header: 'Completion', sortable: true, value: (s) => s.summary.completionPct, render: (s) => <ProgressBar pct={s.summary.completionPct} label="" /> },
    { key: 'rate', header: 'Attendance rate', sortable: true, align: 'right', value: (s) => s.summary.attendanceRate, render: (s) => `${s.summary.attendanceRate ?? 0}%` }
  ];
  return (
    <>
      <PageHeader title="Student attendance summary" />
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('attendance-summary', columnsToCsv(columns), rows)} />
      <DataTable columns={columns} rows={rows} getRowId={(s) => s.studentId} loading={!students && !error} error={error ? { message: error } : null}
        sort={t.sort} onSort={t.onSort} caption="Attendance summary per student"
        empty={{ title: 'No students found', body: t.search || t.filters.progress ? 'Nothing matches this search or filter.' : 'No students are assigned to you yet.' }}
        rowActions={(s) => <Link className="font-semibold text-amber-600 underline" to={`/teacher/attendance/${s.studentId}`}>View</Link>} />
    </>
  );
}
