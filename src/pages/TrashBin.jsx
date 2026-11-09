import { useState } from 'react';
import { AlertTriangle, Clock, RotateCcw, Trash2 } from 'lucide-react';
import { DataTable, FilterBar, PageHeader, useTableState } from '../components/datatable';
import { ConfirmDialog, ErrorBanner, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { useTrash, useTrashAction } from '../hooks/useSystem';
import SystemReady from '../components/SystemReady';

/**
 * Deleted records, and seven days to change your mind.
 *
 * The column that matters most is how many days are left, because after that nothing here can be
 * brought back. Anything with two days or fewer is called out, since a record quietly reaching the
 * end of its window is exactly the failure this page exists to prevent.
 */
const when = (iso) => { const d = new Date(iso); return isNaN(d) ? String(iso || '') : d.toLocaleDateString(); };

function DaysLeft({ n }) {
  const tone = n <= 0 ? 'bg-red-100 text-red-700' : n <= 2 ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-800';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Clock size={11} aria-hidden="true" />
      {n <= 0 ? 'Due to be removed' : n === 1 ? '1 day left' : n + ' days left'}
    </span>);
}

/** What came out of the system with this record, so restoring is not a leap of faith. */
function Contents({ counts }) {
  const keys = Object.keys(counts || {}).sort((a, b) => counts[b] - counts[a]);
  if (!keys.length) return null;
  return (
    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
      {keys.map((k) => <li key={k} className="flex justify-between gap-3 rounded bg-forest-100/50 px-2 py-1">
        <span>{k}</span><span className="font-mono font-semibold">{counts[k]}</span></li>)}
    </ul>);
}

function DestroyDialog({ item, onClose }) {
  const mut = useTrashAction('destroy');
  const [password, setPassword] = useState('');
  return (
    <Modal title={'Delete ' + item.recordName + ' for good?'} onClose={onClose}>
      <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>This removes {item.totalRows.toLocaleString()} record{item.totalRows === 1 ? '' : 's'} and every file
          uploaded with them. There is no way back from this, and no backup is taken.</span>
      </p>
      <Contents counts={item.counts} />
      <label className="mt-4 block text-sm font-medium" htmlFor="tb-pw">Enter your password to confirm</label>
      <input id="tb-pw" type="password" autoFocus className={`mt-1 ${inputCls}`} value={password}
        onChange={(e) => setPassword(e.target.value)} />
      <ErrorBanner error={mut.error} />
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button disabled={!password || mut.isPending}
          className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => mut.mutate({ trashId: item.trashId, password }, { onSuccess: onClose })}>
          {mut.isPending ? 'Deleting...' : 'Delete permanently'}
        </button>
      </div>
    </Modal>);
}

export default function TrashBin() {
  const t = useTableState({ type: '' });
  const { data, isLoading, error } = useTrash({ q: t.search, type: t.filters.type });
  const restore = useTrashAction('restore');
  const [modal, setModal] = useState(null);

  const columns = [
    { key: 'type', header: 'Type', value: (x) => x.recordType,
      render: (x) => <span className="rounded bg-forest-100 px-2 py-0.5 text-xs font-semibold">{x.recordType}</span> },
    { key: 'name', header: 'Name', value: (x) => x.recordName,
      render: (x) => (<div><span className="font-medium">{x.recordName}</span>
        <span className="block text-xs text-forest-700">{x.totalRows.toLocaleString()} record{x.totalRows === 1 ? '' : 's'} held</span></div>) },
    { key: 'by', header: 'Deleted by', value: (x) => x.deletedByName,
      render: (x) => <span className="text-sm">{x.deletedByName}</span> },
    { key: 'date', header: 'Deleted', value: (x) => x.deletedDate, render: (x) => <span className="text-xs">{when(x.deletedDate)}</span> },
    { key: 'left', header: 'Days remaining', value: (x) => String(x.daysRemaining), render: (x) => <DaysLeft n={x.daysRemaining} /> }
  ];

  return (
    <>
      <PageHeader title="Trash Bin" subtitle={`Deleted records are kept for ${data?.retentionDays || 7} days, then removed for good.`} />

      <SystemReady ready={data?.ready} />

      {data?.expiringSoon > 0 && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {data.expiringSoon} item{data.expiringSoon === 1 ? ' has' : 's have'} two days or fewer left. After that they cannot be brought back.
        </p>)}

      <p className="mb-5 text-sm text-forest-700">
        Deleting a student here means their attendance, journals, evaluations, merits, infractions and DTRs
        as well — they were taken out together and they come back together. Uploaded photos stay in Drive
        until the record is deleted for good.
      </p>

      <FilterBar searchPlaceholder="Search by name or who deleted it..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={[{ key: 'type', label: 'Type', options: (data?.types || []).map((x) => ({ value: x.key, label: x.label })) }]}
        values={t.filters} onApply={t.setFilters} onReset={t.reset} />

      <DataTable
        columns={columns} rows={data?.items || []} getRowId={(x) => x.trashId}
        loading={isLoading} error={error} unit="item"
        empty={{ title: 'The Trash Bin is empty', body: 'Nothing has been deleted in the last seven days.' }}
        rowActions={(x) => (<>
          <button onClick={() => setModal({ type: 'restore', item: x })} className="inline-flex items-center gap-1 font-semibold text-amber-600 underline">
            <RotateCcw size={12} aria-hidden="true" />Restore
          </button>
          <button onClick={() => setModal({ type: 'destroy', item: x })} className="ml-3 inline-flex items-center gap-1 font-semibold text-red-700 underline">
            <Trash2 size={12} aria-hidden="true" />Delete for good
          </button>
        </>)} />

      {modal?.type === 'restore' && (
        <ConfirmDialog
          title={'Restore ' + modal.item.recordName + '?'}
          text={`All ${modal.item.totalRows.toLocaleString()} records taken out with this one are put back. They are appended to the end of their sheets, which does not matter — everything in this system is linked by id, not by position.`}
          confirmLabel="Restore" busy={restore.isPending} error={restore.error}
          onCancel={() => setModal(null)}
          onConfirm={() => restore.mutate({ trashId: modal.item.trashId }, { onSuccess: () => setModal(null) })} />)}

      {modal?.type === 'destroy' && <DestroyDialog item={modal.item} onClose={() => setModal(null)} />}
    </>
  );
}
