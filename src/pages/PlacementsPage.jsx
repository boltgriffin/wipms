import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, MapPin, Shuffle } from 'lucide-react';
import {
  DataTable, EmptyState, FilterBar, LoadingState, PageHeader, Pagination,
  btnGhost, btnPrimary, columnsToCsv, exportCsv, inputCls, useTableState
} from '../components/datatable';
import { ErrorBanner, Field, Modal } from '../components/ui';
import { ASSIGN_TYPE_LABEL, DeployTag } from '../components/deployUi';
import { useCapacities, useDeployAction, usePlacementLogs, usePlacements, useStrandMap } from '../hooks/useDeploy';

const PAGE = 12;

/** Moving one student. A transfer must be explained, because somebody will ask why later. */
function AssignForm({ student, onClose }) {
  const { data: caps } = useCapacities({});
  const mut = useDeployAction('assign');
  const [institutionId, setInstitutionId] = useState(student.institutionId || '');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(null);
  const err = mut.error?.fields || {};
  const list = (caps?.items || []).filter((i) => i.acceptsStudents || i.id === student.institutionId);
  const moving = !!student.institutionId && institutionId !== student.institutionId;

  if (done) {
    return (
      <Modal title={student.name} onClose={onClose}>
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
          Placement saved.{done.autoFilled > 0 && <> The slot they left was taken by {done.autoFilled} student{done.autoFilled === 1 ? '' : 's'} from the waitlist.</>}
        </p>
        <button onClick={onClose} className={`${btnPrimary} mt-4`}>Close</button>
      </Modal>
    );
  }
  return (
    <Modal title={`Placement — ${student.name}`} onClose={onClose}>
      <dl className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-paper p-3 text-sm">
        <div><dt className="text-xs text-forest-700">Strand</dt><dd className="mt-0.5 font-semibold">{student.strand || 'Not set'}</dd></div>
        <div><dt className="text-xs text-forest-700">Status</dt><dd className="mt-0.5"><DeployTag status={student.status} /></dd></div>
        <div className="col-span-2"><dt className="text-xs text-forest-700">Address</dt>
          <dd className="mt-0.5">{[student.address, student.barangay, student.municipality, student.province].filter(Boolean).join(', ') || 'Not set'}</dd></div>
      </dl>

      <Field label="Institution">
        <select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} className={`mt-1 ${inputCls}`}>
          <option value="">No placement</option>
          {list.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} — {i.availableSlots} free{i.id === student.institutionId ? ' (current)' : ''}
            </option>))}
        </select>
        <span className="mt-1 block text-xs text-forest-700">Full and closed institutions are not listed.</span>
      </Field>

      {moving && (
        <div className="mt-4">
          <Field label="Why is this student being transferred?" error={err.reason} hint="At least 5 characters. Kept in the placement log.">
            <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputCls}`} />
          </Field>
        </div>)}

      {student.status === 'ACTIVE' || student.status === 'DEPLOYED' ? (
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">
          This student has already started rendering hours at {student.institution}. Their attendance stays with the old institution;
          only new days count at the new one.
        </p>) : null}

      <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
      <div className="mt-4 flex gap-3">
        <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
        <button disabled={mut.isPending} className={`${btnPrimary} flex-1`}
          onClick={() => mut.mutate({ studentId: student.studentId, institutionId, reason }, { onSuccess: setDone })}>
          {mut.isPending ? 'Saving...' : 'Save placement'}
        </button>
      </div>
    </Modal>
  );
}

function AddressForm({ student, onClose }) {
  const mut = useDeployAction('address');
  const [f, setF] = useState({ address: student.address || '', barangay: student.barangay || '', municipality: student.municipality || '', province: student.province || '' });
  const err = mut.error?.fields || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={`Address — ${student.name}`} onClose={onClose}>
      <p className="mb-4 text-sm text-forest-700">
        The municipality decides which institutions count as near, and the barangay narrows it further. Leave a box blank and
        it is read from the address.
      </p>
      <div className="space-y-4">
        <Field label="Home address" error={err.address} hint="Purok, street or sitio">
          <input value={f.address} maxLength={200} onChange={set('address')} placeholder="Purok 3" className={`mt-1 ${inputCls}`} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Barangay"><input value={f.barangay} maxLength={60} onChange={set('barangay')} placeholder="Anahawon" className={`mt-1 ${inputCls}`} /></Field>
          <Field label="Municipality"><input value={f.municipality} maxLength={60} onChange={set('municipality')} placeholder="Maramag" className={`mt-1 ${inputCls}`} /></Field>
          <Field label="Province"><input value={f.province} maxLength={60} onChange={set('province')} placeholder="Bukidnon" className={`mt-1 ${inputCls}`} /></Field>
        </div>
        <p className="rounded-lg bg-blue-50 p-3 text-xs">
          No coordinates are needed. The municipality and barangay are what the assignment engine matches on; the student
          may optionally pin their home themselves, which only breaks a tie between equally near institutions.
        </p>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending} className={`${btnPrimary} flex-1`}
            onClick={() => mut.mutate({ studentId: student.studentId, ...f }, { onSuccess: onClose })}>
            {mut.isPending ? 'Saving...' : 'Save address'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryModal({ student, onClose }) {
  const { data, isLoading } = usePlacementLogs(student.studentId);
  return (
    <Modal wide title={`Placement history — ${student.name}`} onClose={onClose}>
      {isLoading && <LoadingState />}
      {data && !data.items.length && <p className="text-sm text-forest-700">Nothing recorded yet.</p>}
      <ul className="space-y-3">
        {(data?.items || []).map((l) => (
          <li key={l.id} className="border-b border-forest-100 pb-3 text-sm last:border-0">
            <p className="font-semibold">{l.action.replace(/_/g, ' ').toLowerCase()}</p>
            <p className="text-xs text-forest-700">
              {l.from ? `${l.from} → ` : ''}{l.to || '—'} · {String(l.at).slice(0, 16).replace('T', ' ')}{l.actor ? ` · ${l.actor}` : ''}
            </p>
            {l.reason && <p className="mt-0.5 text-xs">{l.reason}</p>}
          </li>))}
      </ul>
    </Modal>
  );
}

export default function PlacementsPage() {
  const [sp] = useSearchParams();
  const { data: meta } = useStrandMap();
  const strands = meta?.strands || ['ICT', 'EIM'];
  const filters = [
    { key: 'status', label: 'Deployment status', type: 'select', options: [{ value: '', label: 'All' }].concat(
      ['UNASSIGNED', 'WAITLISTED', 'AUTO_ASSIGNED', 'ADMIN_ASSIGNED', 'SCHEDULED', 'DEPLOYED', 'ACTIVE', 'COMPLETED']
        .map((v) => ({ value: v, label: v.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) }))) },
    { key: 'strand', label: 'Strand', type: 'select', options: [{ value: '', label: 'All' }].concat(strands.map((s) => ({ value: s, label: s }))) }
  ];
  const t = useTableState({ status: sp.get('status') || '', strand: '' }, { key: 'name', dir: 'asc' });
  const { data, isLoading, error } = usePlacements(t.params);
  const fill = useDeployAction('fillWaitlist');
  const [assign, setAssign] = useState(null);
  const [address, setAddress] = useState(null);
  const [history, setHistory] = useState(null);

  const rows = useMemo(() => {
    const all = data?.items || [];
    const q = t.search.toLowerCase();
    return q ? all.filter((s) => `${s.name} ${s.lrn} ${s.institution} ${s.address}`.toLowerCase().includes(q)) : all;
  }, [data, t.search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(t.page, pages);
  const view = rows.slice((page - 1) * PAGE, page * PAGE);
  const waiting = (data?.items || []).filter((s) => s.status === 'WAITLISTED').length;

  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (r) => r.name,
      render: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs text-forest-700">{r.lrn} · Grade {r.gradeLevel} {r.section}</span></> },
    { key: 'strand', header: 'Strand', sortable: true, nowrap: true, value: (r) => r.strand,
      render: (r) => r.strand ? <span title={r.strandLabel}>{r.strand}</span> : <span className="text-xs text-amber-700">Not set</span> },
    { key: 'institution', header: 'Institution', sortable: true, value: (r) => r.institution,
      render: (r) => r.institution
        ? <><span>{r.institution}</span>{r.assignmentType && <span className="block text-xs text-forest-700">{ASSIGN_TYPE_LABEL[r.assignmentType] || r.assignmentType}</span>}</>
        : <span className="text-xs text-forest-700">—</span> },
    { key: 'status', header: 'Status', sortable: true, nowrap: true, value: (r) => r.status, render: (r) => <DeployTag status={r.status} /> },
    { key: 'batch', header: 'Batch', sortable: true, nowrap: true, value: (r) => r.batch, render: (r) => r.batch || <span className="text-xs text-forest-700">—</span> },
    { key: 'deployed', header: 'Deployed on', sortable: true, nowrap: true, value: (r) => r.deployedOn || '',
      render: (r) => r.deployedOn ? <><span>{r.deployedOn}</span><span className="block text-xs text-forest-700">first attendance</span></> : <span className="text-xs text-forest-700">—</span> },
    { key: 'hours', header: 'Hours', sortable: true, nowrap: true, value: (r) => r.hours,
      render: (r) => <span>{r.hours}<span className="text-xs font-normal text-forest-700"> / {r.requiredHours}</span></span> }
  ];

  return (
    <>
      <PageHeader title="Placements" subtitle="Every student and where they stand. Assignments and transfers are an administrator's alone." />

      {waiting > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm"><span className="font-semibold">{waiting} student{waiting === 1 ? '' : 's'} on the waitlist.</span> They are placed automatically whenever slots appear.</p>
          <button disabled={fill.isPending} onClick={() => fill.mutate()} className={btnPrimary}>
            {fill.isPending ? 'Checking...' : 'Fill waitlist now'}
          </button>
        </div>)}
      {fill.data && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">
        {fill.data.assigned ? `${fill.data.assigned} student${fill.data.assigned === 1 ? '' : 's'} placed from the waitlist.` : 'No slots are free, so nobody could be placed yet.'}
      </p>}

      <FilterBar searchPlaceholder="Search name, LRN, institution or address..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={filters} values={t.filters} onApply={t.setFilters} onReset={t.reset}
        onExport={() => exportCsv('wipms-placements', columnsToCsv(columns), rows)} />

      {isLoading ? <LoadingState label="Loading placements..." />
        : !rows.length ? <EmptyState title="No students to show" body="Nothing matches the current search and filter." action={<button onClick={t.reset} className={btnGhost}>Reset</button>} />
          : (
            <>
              <DataTable columns={columns} rows={view} getRowId={(r) => r.studentId} error={error} sort={t.sort} onSort={t.onSort}
                caption="Students and their placements"
                rowActions={(r) => [
                  <button key="a" onClick={() => setAssign(r)} className={`${btnGhost} inline-flex items-center gap-1`}><Shuffle size={14} aria-hidden="true" />Place</button>,
                  <button key="ad" onClick={() => setAddress(r)} className={`${btnGhost} inline-flex items-center gap-1`}><MapPin size={14} aria-hidden="true" />Address</button>,
                  <button key="h" onClick={() => setHistory(r)} className={`${btnGhost} inline-flex items-center gap-1`}><History size={14} aria-hidden="true" />History</button>
                ]} />
              <Pagination page={page} pages={pages} total={rows.length} onPage={t.setPage} unit="student" />
            </>)}

      {assign && <AssignForm student={assign} onClose={() => setAssign(null)} />}
      {address && <AddressForm student={address} onClose={() => setAddress(null)} />}
      {history && <HistoryModal student={history} onClose={() => setHistory(null)} />}
    </>
  );
}
