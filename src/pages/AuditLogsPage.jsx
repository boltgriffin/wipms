import { ScrollText } from 'lucide-react';
import { DataTable, FilterBar, PageHeader, Pagination, exportCsv, useTableState } from '../components/datatable';
import { ErrorBanner } from '../components/ui';
import { useAuditLogs } from '../hooks/useSystem';

/**
 * Who did what, and when.
 *
 * Nothing on this page can be edited or deleted, by anyone, including from here — a log an
 * administrator can tidy up is not evidence of anything. It survives every reset for the same
 * reason.
 */
const when = (iso) => { const d = new Date(iso); return isNaN(d) ? String(iso || '') : d.toLocaleString(); };

const TONE = { SUCCESS: 'bg-green-100 text-green-800', FAILURE: 'bg-red-100 text-red-700', PARTIAL: 'bg-amber-100 text-amber-900' };

export default function AuditLogsPage() {
  const t = useTableState({ action: '', result: '', from: '', to: '' });
  const { data, isLoading, error } = useAuditLogs({ q: t.search, ...t.filters, page: t.page });

  const columns = [
    { key: 'time', header: 'When', value: (r) => r.timestamp, render: (r) => <span className="whitespace-nowrap text-xs">{when(r.timestamp)}</span> },
    { key: 'who', header: 'Who', value: (r) => r.userName,
      render: (r) => <span className="text-sm">{r.userName}</span> },
    { key: 'action', header: 'Action', value: (r) => r.action,
      render: (r) => <span className="rounded bg-forest-100 px-2 py-0.5 font-mono text-xs font-semibold">{r.action}</span> },
    { key: 'details', header: 'Details', value: (r) => r.details, render: (r) => <span className="text-sm">{r.details}</span> },
    { key: 'result', header: 'Result', value: (r) => r.result,
      render: (r) => <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TONE[r.result] || 'bg-gray-100 text-gray-700'}`}>{r.result}</span> }
  ];

  if (error) return <ErrorBanner error={error} />;

  return (
    <>
      <PageHeader title="Audit logs" subtitle="Every sign-in, change and deletion, in the order it happened." />

      <p className="mb-5 flex items-start gap-2 rounded-xl bg-forest-100/50 p-4 text-sm">
        <ScrollText size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          This log cannot be edited or cleared from the app, and it survives every reset — including Reset
          Everything. {data ? data.allTime.toLocaleString() : '—'} entries recorded so far.
        </span>
      </p>

      <FilterBar
        searchPlaceholder="Search by person, action or detail..."
        search={t.searchInput} onSearch={t.setSearchInput}
        filters={[
          { key: 'action', label: 'Action', options: (data?.actions || []).map((a) => ({ value: a, label: a })) },
          { key: 'result', label: 'Result', options: [{ value: 'SUCCESS', label: 'Success' }, { value: 'FAILURE', label: 'Failure' }, { value: 'PARTIAL', label: 'Partial' }] },
          { key: 'from', label: 'From', type: 'date' },
          { key: 'to', label: 'To', type: 'date' }
        ]}
        values={t.filters}
        onApply={t.setFilters}
        onReset={t.reset}
        onExport={() => exportCsv('wipms-audit-log', columns, data?.items || [])}
        exportLabel="Export this page" />

      <DataTable columns={columns} rows={data?.items || []} getRowId={(r) => r.logId}
        loading={isLoading} unit="entry"
        empty={{ title: 'Nothing recorded yet', body: 'Actions appear here as people use the system.' }} />

      {data && data.pages > 1 && <Pagination page={data.page} pages={data.pages} total={data.total} onPage={t.setPage} unit="entry" />}
    </>
  );
}
