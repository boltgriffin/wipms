import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import JournalPanel from '../components/JournalPanel';
import { JOURNAL_STATUSES, JournalBadge, fmt } from '../components/journalUi';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useJournalQueue } from '../hooks/useJournals';

export default function TeacherJournals() {
  const [sp, setSp] = useSearchParams();
  const [panel, setPanel] = useState(sp.get('review'));
  const t = useTableState({ status: 'Pending', studentId: '' }, { key: 'date', dir: 'desc' });
  const query = useJournalQueue({ ...t.params, pageSize: 10 });
  const d = query.data, c = d?.counts;
  useEffect(() => { if (sp.get('review')) setSp({}, { replace: true }); }, []); // eslint-disable-line

  const filters = [
    { key: 'status', label: 'Status', anyLabel: 'All statuses', options: [{ value: 'Pending', label: 'Pending (review queue)' }, { value: 'All', label: 'All statuses' },
      ...JOURNAL_STATUSES.filter((x) => x !== 'Pending').map((x) => ({ value: x, label: x }))] },
    { key: 'studentId', label: 'Student', options: (d?.students || []).map((s) => ({ value: s.id, label: s.name })) }
  ];
  const columns = [
    { key: 'student', header: 'Student', sortable: true, value: (j) => j.studentName, render: (j) => <span className="font-medium">{j.studentName}</span> },
    { key: 'date', header: 'Journal date', sortable: true, nowrap: true, value: (j) => j.date, render: (j) => j.date },
    { key: 'preview', header: 'Activities', value: (j) => j.preview, render: (j) => <>{j.preview}{j.preview.length >= 140 ? '...' : ''}</> },
    { key: 'submitted', header: 'Submitted', sortable: true, nowrap: true, value: (j) => j.submittedAt,
      render: (j) => <>{fmt(j.submittedAt)}{j.revisionCount ? <span className="block text-xs text-forest-700">revision {j.revisionCount}</span> : null}</> },
    { key: 'status', header: 'Status', sortable: true, value: (j) => j.status, render: (j) => <JournalBadge status={j.status} /> }
  ];
  return (
    <>
      <PageHeader title="Journal review" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending journals" value={c?.pending} hint="Waiting for your review" /><StatCard label="Approved" value={c?.approved} />
        <StatCard label="Revision required" value={c?.revision} /><StatCard label="Rejected" value={c?.rejected} />
      </div>
      <FilterBar searchPlaceholder="Search student or activity..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('journals', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={query.isLoading} error={query.error} sort={t.sort} onSort={t.onSort} caption="Student journals"
        empty={{ title: 'No journals found', body: t.filters.status === 'Pending' ? 'Nothing is waiting for review.' : 'Nothing matches this search or filter.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="journal"
        rowActions={(j) => <button className="font-semibold text-amber-600 underline" onClick={() => setPanel(j.id)}>{j.status === 'Pending' ? 'Review' : 'View'}</button>} />
      {panel && <JournalPanel id={panel} onClose={() => setPanel(null)} />}
    </>
  );
}
