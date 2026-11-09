import { useMemo, useState } from 'react';
import { Info, Layers } from 'lucide-react';
import {
  DataTable, EmptyState, FilterBar, LoadingState, PageHeader, Pagination,
  btnGhost, btnPrimary, columnsToCsv, exportCsv, inputCls, useTableState
} from '../components/datatable';
import { ErrorBanner, Field, Modal } from '../components/ui';
import { InstTag, SlotBar, StatTile } from '../components/deployUi';
import { useCapacities, useDeployAction } from '../hooks/useDeploy';

const PAGE = 10;
const FILTERS = [{ key: 'status', label: 'Institution status', type: 'select', options: [
  { value: '', label: 'All' }, { value: 'OPEN', label: 'Open' }, { value: 'FULL', label: 'Full' }, { value: 'CLOSED', label: 'Closed' }
] }];

/** Capacity is edited as the two numbers that make it up, never as the total. */
function CapacityForm({ inst, onClose }) {
  const mut = useDeployAction('capacity');
  const [f, setF] = useState({ originalCapacity: inst.originalCapacity, additionalSlots: inst.additionalSlots, instStatus: inst.status === 'CLOSED' ? 'CLOSED' : 'OPEN' });
  const [done, setDone] = useState(null);
  const err = mut.error?.fields || {};
  const num = (k) => (e) => setF({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) });
  const total = (Number(f.originalCapacity) || 0) + (Number(f.additionalSlots) || 0);
  const free = total - inst.assignedStudents;

  if (done) {
    return (
      <Modal title={inst.name} onClose={onClose}>
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
          Capacity is now {done.institution.totalCapacity} with {done.institution.availableSlots} free.
          {done.autoFilled > 0 && <> <span className="font-semibold">{done.autoFilled} student{done.autoFilled === 1 ? '' : 's'} came off the waitlist straight away.</span></>}
        </p>
        {done.filledDetails?.length > 0 && (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {done.filledDetails.map((d) => <li key={d.studentId}>{d.name} &rarr; {d.institution}</li>)}
          </ul>)}
        <button onClick={onClose} className={`${btnPrimary} mt-4`}>Close</button>
      </Modal>
    );
  }

  return (
    <Modal title={`Capacity — ${inst.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Original capacity" error={err.originalCapacity}>
            <input type="number" min={0} max={1000} value={f.originalCapacity} onChange={num('originalCapacity')} className={`mt-1 ${inputCls}`} />
          </Field>
          <Field label="Additional slots" error={err.additionalSlots} hint="Extra places agreed later">
            <input type="number" min={0} max={1000} value={f.additionalSlots} onChange={num('additionalSlots')} className={`mt-1 ${inputCls}`} />
          </Field>
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-lg bg-paper p-3 text-sm">
          <div><dt className="text-xs text-forest-700">Total capacity</dt><dd className="mt-0.5 text-lg font-bold">{total}</dd></div>
          <div><dt className="text-xs text-forest-700">Assigned</dt><dd className="mt-0.5 text-lg font-bold">{inst.assignedStudents}</dd></div>
          <div><dt className="text-xs text-forest-700">Available</dt><dd className={`mt-0.5 text-lg font-bold ${free < 0 ? 'text-red-700' : ''}`}>{Math.max(0, free)}</dd></div>
        </dl>
        {free < 0 && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Capacity cannot be lower than the {inst.assignedStudents} students already assigned here. Transfer some of them first.
          </p>)}

        <Field label="Institution status">
          <select value={f.instStatus} onChange={(e) => setF({ ...f, instStatus: e.target.value })} className={`mt-1 ${inputCls}`}>
            <option value="OPEN">Open — can receive students</option>
            <option value="CLOSED">Closed — no new assignments</option>
          </select>
          <span className="mt-1 block text-xs text-forest-700">Closing does not move the students already there. Full is worked out from the slots, not set here.</span>
        </Field>

        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          Adding slots fills the waitlist immediately, oldest wait first.
        </p>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending || free < 0} className={`${btnPrimary} flex-1`}
            onClick={() => mut.mutate({ institutionId: inst.id, ...f }, { onSuccess: setDone })}>
            {mut.isPending ? 'Saving...' : 'Save capacity'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CapacitiesPage() {
  const t = useTableState({ status: '' }, { key: 'name', dir: 'asc' });
  const { data, isLoading, error } = useCapacities(t.params);
  const [edit, setEdit] = useState(null);

  const rows = useMemo(() => {
    const all = data?.items || [];
    const q = t.search.toLowerCase();
    return q ? all.filter((i) => `${i.name} ${i.address} ${i.industry}`.toLowerCase().includes(q)) : all;
  }, [data, t.search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(t.page, pages);
  const view = rows.slice((page - 1) * PAGE, page * PAGE);
  const tot = data?.totals || {};

  const columns = [
    { key: 'name', header: 'Institution', sortable: true, value: (r) => r.name,
      render: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs text-forest-700">{r.industry}{r.city ? ` · ${r.city}` : ''}</span></> },
    { key: 'capacity', header: 'Capacity', sortable: true, nowrap: true, value: (r) => r.totalCapacity,
      render: (r) => <span className="font-semibold">{r.totalCapacity}</span> },
    { key: 'assigned', header: 'Used', sortable: true, value: (r) => r.assignedStudents, render: (r) => <SlotBar inst={r} /> },
    { key: 'available', header: 'Available', sortable: true, nowrap: true, value: (r) => r.availableSlots,
      render: (r) => <span className={`font-semibold ${r.availableSlots === 0 ? 'text-amber-700' : ''}`}>{r.availableSlots}</span> },
    { key: 'status', header: 'Status', sortable: true, nowrap: true, value: (r) => r.status, render: (r) => <InstTag status={r.status} /> },
    { key: 'gps', header: 'GPS', nowrap: true, value: (r) => (r.geotagged ? 'Set' : 'Not set'),
      render: (r) => <span className="text-xs text-forest-700">{r.geotagged ? 'Set' : 'Not set'}</span> }
  ];

  return (
    <>
      <PageHeader title="Institution capacities" subtitle="Total capacity is the original capacity plus any additional slots. Available is what is left once assigned students are counted." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total capacity" value={tot.totalCapacity ?? 0} icon={Layers} />
        <StatTile label="Assigned" value={tot.assigned ?? 0} />
        <StatTile label="Available slots" value={tot.availableSlots ?? 0} tone={tot.availableSlots ? 'bg-green-50' : 'bg-amber-50'} />
        <StatTile label="Institutions" value={tot.institutions ?? 0} hint={`${tot.open ?? 0} open · ${tot.full ?? 0} full · ${tot.closed ?? 0} closed`} />
      </div>

      <FilterBar searchPlaceholder="Search institution, industry or address..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={FILTERS} values={t.filters} onApply={t.setFilters} onReset={t.reset}
        onExport={() => exportCsv('wipms-capacities', columnsToCsv(columns), rows)} />

      {isLoading ? <LoadingState label="Loading capacities..." />
        : !rows.length ? <EmptyState title="No institutions to show" body="Nothing matches the current search and filter." action={<button onClick={t.reset} className={btnGhost}>Reset</button>} />
          : (
            <>
              <DataTable columns={columns} rows={view} getRowId={(r) => r.id} error={error} sort={t.sort} onSort={t.onSort}
                caption="Institutions with their capacity and free slots"
                rowActions={(r) => [<button key="cap" onClick={() => setEdit(r)} className={btnGhost}>Set capacity</button>]} />
              <Pagination page={page} pages={pages} total={rows.length} onPage={t.setPage} unit="institution" />
            </>)}

      {edit && <CapacityForm inst={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
