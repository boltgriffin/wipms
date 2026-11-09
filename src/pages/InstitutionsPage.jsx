import { useState } from 'react';
import InstitutionForm from '../components/InstitutionForm';
import InstitutionMapModal from '../components/InstitutionMapModal';
import { ConfirmDialog } from '../components/ui';
import { DataTable, FilterBar, PageHeader, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useInstitutionAction, useInstitutions, useMeta } from '../hooks/useManagement';
import { useAuthStore } from '../store/authStore';

const EMPTY = { industry: '', availability: '' };

export default function InstitutionsPage() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const { data: meta, error: metaError } = useMeta();
  const t = useTableState(EMPTY, { key: 'name', dir: 'asc' });
  const [modal, setModal] = useState(null);
  const query = useInstitutions({ ...t.params, pageSize: 10 });
  const del = useInstitutionAction('delete');
  const d = query.data;

  const filters = [
    { key: 'industry', label: 'Industry type', options: (meta?.industries || []).map((i) => ({ value: i, label: i })) },
    { key: 'availability', label: 'Availability', anyLabel: 'Any availability', options: [{ value: 'available', label: 'With open slots' }] }
  ];
  const columns = [
    { key: 'name', header: 'Institution', sortable: true, value: (i) => i.institutionName,
      render: (i) => <><span className="font-medium">{i.institutionName}</span><span className="block text-xs text-forest-700">{i.address}</span></> },
    { key: 'industry', header: 'Industry', sortable: true, value: (i) => i.industryType, render: (i) => i.industryType },
    { key: 'contact', header: 'Contact', sortable: true, value: (i) => `${i.contactPerson} (${i.contactNumber})`,
      render: (i) => <>{i.contactPerson}<span className="block text-xs text-forest-700">{i.contactNumber}</span></> },
    { key: 'email', header: 'Email', sortable: true, value: (i) => i.email, render: (i) => i.email },
    { key: 'assigned', header: 'Assigned / total', sortable: true, align: 'right', value: (i) => `${i.assignedCount}/${i.availableSlots}`, render: (i) => `${i.assignedCount} / ${i.availableSlots}` },
    { key: 'remaining', header: 'Open', sortable: true, align: 'right', value: (i) => i.remainingSlots,
      render: (i) => <span className={`font-semibold ${i.remainingSlots ? 'text-green-700' : 'text-red-700'}`}>{i.remainingSlots}</span> },
    { key: 'gps', header: 'GPS', value: (i) => (i.latitude != null ? `${i.latitude}, ${i.longitude}` : ''), cardHide: true,
      render: (i) => (i.latitude != null
        ? <button type="button" onClick={() => setModal({ type: 'map', institution: i })}
            className="font-mono text-xs underline" title="View on the map">
            {i.latitude.toFixed(4)}, {i.longitude.toFixed(4)}
          </button>
        : <span className="text-xs text-forest-700">Not set</span>) }
  ];

  return (
    <>
      <PageHeader title="Institutions" actions={admin && meta ? <button className={btnPrimary} onClick={() => setModal({ type: 'form' })}>Add institution</button> : null} />
      <FilterBar searchPlaceholder="Search institutions..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={filters} values={t.filters} onApply={t.setFilters} onReset={t.reset}
        onExport={() => exportCsv('institutions', columnsToCsv(columns), d?.items || [])} />

      <DataTable columns={columns} rows={d?.items} getRowId={(i) => i.institutionId} loading={query.isLoading} error={metaError || query.error}
        sort={t.sort} onSort={t.onSort} caption="Institutions"
        empty={{ title: 'No institutions found', body: t.search || Object.values(t.filters).some(Boolean) ? 'No institution matches this search or filter.' : admin ? 'Add the first partner institution.' : 'No institutions have been added yet.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="institution"
        rowActions={admin ? (i) => (<>
          <button className="font-semibold underline" onClick={() => setModal({ type: 'map', institution: i })}>Map</button>
          <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'form', institution: i })}>Edit</button>
          <button className="ml-3 font-semibold text-red-700 underline" onClick={() => { del.reset(); setModal({ type: 'delete', institution: i }); }}>Delete</button>
        </>) : null} />

      {modal?.type === 'form' && meta && <InstitutionForm institution={modal.institution} meta={meta} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
      {modal?.type === 'map' && <InstitutionMapModal institution={modal.institution} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Delete institution?" confirmLabel="Delete" busy={del.isPending} error={del.error}
          text={`Delete ${modal.institution.institutionName}? This cannot be undone. Institutions with assigned students cannot be deleted.`}
          onCancel={() => setModal(null)} onConfirm={() => del.mutate({ id: modal.institution.institutionId }, { onSuccess: () => setModal(null) })} />)}
    </>
  );
}
