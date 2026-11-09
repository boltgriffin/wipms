import { useState } from 'react';
import StatCard from '../components/StatCard';
import JournalForm from '../components/JournalForm';
import JournalPanel from '../components/JournalPanel';
import { JOURNAL_STATUSES, JournalBadge } from '../components/journalUi';
import { DataTable, FilterBar, PageHeader, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useMyJournals } from '../hooks/useJournals';

export default function StudentJournals() {
  const t = useTableState({ status: '', month: '' }, { key: 'date', dir: 'desc' });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const q = useMyJournals({ ...t.params, pageSize: 10 });
  const d = q.data, s = d?.summary;
  const filters = [
    { key: 'status', label: 'Status', anyLabel: 'All statuses', options: JOURNAL_STATUSES.map((x) => ({ value: x, label: x })) },
    { key: 'month', label: 'Month', type: 'month' }
  ];
  const columns = [
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (j) => j.date, render: (j) => j.date },
    { key: 'preview', header: 'Activities', value: (j) => j.preview, render: (j) => <>{j.preview}{j.preview.length >= 140 ? '...' : ''}</> },
    { key: 'proof', header: 'Proof', value: (j) => (j.hasProof ? 'Yes' : ''), render: (j) => (j.hasProof ? 'Yes' : '-') },
    { key: 'status', header: 'Status', sortable: true, value: (j) => j.status, render: (j) => <JournalBadge status={j.status} /> }
  ];
  return (
    <>
      <PageHeader title="My journals" actions={<button className={btnPrimary} onClick={() => { setNotice(''); setModal({ type: 'form' }); }}>New journal</button>} />
      {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={s?.total} /><StatCard label="Approved" value={s?.approved} />
        <StatCard label="Pending" value={s?.pending} /><StatCard label="Needs revision" value={s?.revision} />
      </div>
      <FilterBar searchPlaceholder="Search my journals..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('my-journals', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} sort={t.sort} onSort={t.onSort} caption="My journals"
        empty={{ title: 'No journals yet', body: 'Write your first entry with the New journal button.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="journal"
        rowActions={(j) => <button className="font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'view', id: j.id })}>{j.status === 'Revision Required' ? 'Revise' : 'View'}</button>} />
      {modal?.type === 'form' && <JournalForm journal={modal.journal} onClose={() => setModal(null)}
        onSaved={() => { setModal(null); setNotice(modal.journal ? 'Journal resubmitted for review.' : 'Journal submitted for review.'); }} />}
      {modal?.type === 'view' && <JournalPanel id={modal.id} onClose={() => setModal(null)} onEdit={(j) => setModal({ type: 'form', journal: j })} />}
    </>
  );
}
