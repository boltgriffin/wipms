import { useState } from 'react';
import { CalendarRange, Info, Layers, Plus, Trash2 } from 'lucide-react';
import { PageHeader, btnGhost, btnPrimary, inputCls } from '../components/datatable';
import { ErrorBanner, Field, Modal } from '../components/ui';
import { BatchTag, StatTile } from '../components/deployUi';
import { useBatches, useDeployAction, useDeployDashboard } from '../hooks/useDeploy';

function BatchForm({ batch, onClose }) {
  const mut = useDeployAction('batch');
  const [f, setF] = useState({
    batchId: batch?.id || '', batchName: batch?.name || '', startDate: batch?.startDate || '',
    endDate: batch?.endDate || '', status: batch?.status || 'PLANNED', notes: batch?.notes || ''
  });
  const err = mut.error?.fields || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title={batch ? `Edit ${batch.name}` : 'New deployment batch'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Batch name" error={err.batchName}>
          <input value={f.batchName} maxLength={80} onChange={set('batchName')} placeholder="Batch 1" className={`mt-1 ${inputCls}`} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" error={err.startDate}><input type="date" value={f.startDate} onChange={set('startDate')} className={`mt-1 ${inputCls}`} /></Field>
          <Field label="End date" error={err.endDate}><input type="date" value={f.endDate} onChange={set('endDate')} className={`mt-1 ${inputCls}`} /></Field>
        </div>
        <Field label="Status" error={err.status}>
          <select value={f.status} onChange={set('status')} className={`mt-1 ${inputCls}`}>
            <option value="PLANNED">Planned</option><option value="ACTIVE">Active</option><option value="CLOSED">Closed</option>
          </select>
        </Field>
        <Field label="Notes" hint="Optional"><input value={f.notes} maxLength={300} onChange={set('notes')} className={`mt-1 ${inputCls}`} /></Field>
        <p className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          These dates schedule the batch. A student&rsquo;s real deployment date is their first attendance, whenever that falls.
        </p>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending} className={`${btnPrimary} flex-1`} onClick={() => mut.mutate(f, { onSuccess: onClose })}>
            {mut.isPending ? 'Saving...' : 'Save batch'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** The answer to "120 students, 50 slots": split them into consecutive batches of a size you choose. */
function PlanForm({ unbatched, onClose }) {
  const mut = useDeployAction('autoBatch');
  const [f, setF] = useState({ size: 50, weeks: 8, startDate: '' });
  const [done, setDone] = useState(null);
  const err = mut.error?.fields || {};
  const count = f.size > 0 ? Math.ceil(unbatched / f.size) : 0;

  if (done) {
    return (
      <Modal title="Batches created" onClose={onClose}>
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">{done.batches.length} batches for {done.students} students.</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {done.batches.map((b) => <li key={b.batchId}><span className="font-semibold">{b.name}</span> — {b.startDate} to {b.endDate} · {b.students} students</li>)}
        </ul>
        <button onClick={onClose} className={`${btnPrimary} mt-4`}>Close</button>
      </Modal>
    );
  }
  return (
    <Modal title="Plan deployment batches" onClose={onClose}>
      <p className="mb-4 text-sm text-forest-700">
        {unbatched} assigned student{unbatched === 1 ? ' is' : 's are'} not in a batch yet. They are split in alphabetical order into
        consecutive batches, and each one moves to Scheduled.
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Students per batch" error={err.size}>
            <input type="number" min={1} max={1000} value={f.size} onChange={(e) => setF({ ...f, size: Number(e.target.value) })} className={`mt-1 ${inputCls}`} />
          </Field>
          <Field label="Weeks per batch" error={err.weeks}>
            <input type="number" min={1} max={52} value={f.weeks} onChange={(e) => setF({ ...f, weeks: Number(e.target.value) })} className={`mt-1 ${inputCls}`} />
          </Field>
        </div>
        <Field label="First batch starts" error={err.startDate}>
          <input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className={`mt-1 ${inputCls}`} />
        </Field>
        {count > 0 && <p className="rounded-lg bg-paper p-3 text-sm">That makes <span className="font-semibold">{count} batch{count === 1 ? '' : 'es'}</span>, running back to back.</p>}
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending || !unbatched} className={`${btnPrimary} flex-1`} onClick={() => mut.mutate(f, { onSuccess: setDone })}>
            {mut.isPending ? 'Creating...' : 'Create batches'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function BatchesPage() {
  const { data, isLoading, error } = useBatches();
  const { data: dash } = useDeployDashboard();
  const del = useDeployAction('batchDelete');
  const [form, setForm] = useState(null);
  const [plan, setPlan] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const items = data?.items || [];
  const unbatched = data?.unbatched ?? 0;

  return (
    <>
      <PageHeader title="Deployment batches" subtitle="When the institutions cannot take everyone at once, students go out in batches."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPlan(true)} className={`${btnGhost} inline-flex items-center gap-2`}><Layers size={15} aria-hidden="true" />Plan batches</button>
            <button onClick={() => setForm({})} className={`${btnPrimary} inline-flex items-center gap-2`}><Plus size={15} aria-hidden="true" />New batch</button>
          </div>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Batches" value={items.length} icon={CalendarRange} />
        <StatTile label="Scheduled students" value={dash?.students?.scheduled ?? 0} />
        <StatTile label="Assigned but not batched" value={unbatched} tone={unbatched ? 'bg-amber-50' : 'bg-paper'} />
      </div>

      {error && <ErrorBanner error={error} />}
      {isLoading && <p className="text-sm">Loading batches...</p>}
      {!isLoading && !items.length && (
        <div className="rounded-xl border border-dashed border-forest-100 p-10 text-center">
          <p className="font-semibold">No batches yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-forest-700">
            If every assigned student can start at once you do not need batches at all. Create them when the institutions can only
            take a portion at a time.
          </p>
          <button onClick={() => setPlan(true)} className={`${btnPrimary} mt-4`}>Plan batches</button>
        </div>)}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((b) => (
          <li key={b.id} className="rounded-xl border border-forest-100 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-bold">{b.name}</h2>
                <p className="mt-0.5 text-sm text-forest-700">{b.startDate} to {b.endDate}</p>
              </div>
              <BatchTag status={b.status} />
            </div>
            <p className="mt-3 text-2xl font-bold">{b.students}<span className="ml-1 text-sm font-medium text-forest-700">student{b.students === 1 ? '' : 's'}</span></p>
            {b.notes && <p className="mt-2 text-xs text-forest-700">{b.notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setForm(b)} className={btnGhost}>Edit</button>
              <button onClick={() => setConfirm(b)} className={`${btnGhost} inline-flex items-center gap-1`}><Trash2 size={14} aria-hidden="true" />Remove</button>
            </div>
          </li>))}
      </ul>

      {form && <BatchForm batch={form.id ? form : null} onClose={() => setForm(null)} />}
      {plan && <PlanForm unbatched={unbatched} onClose={() => setPlan(false)} />}
      {confirm && (
        <Modal title={`Remove ${confirm.name}?`} onClose={() => setConfirm(null)}>
          <p className="text-sm">
            The batch is closed and its {confirm.students} student{confirm.students === 1 ? '' : 's'} go back to being assigned
            without a batch. Nobody loses their institution or their attendance.
          </p>
          <ErrorBanner error={del.error} />
          <div className="mt-5 flex gap-3">
            <button onClick={() => setConfirm(null)} className={`${btnGhost} flex-1`}>Cancel</button>
            <button disabled={del.isPending} className={`${btnPrimary} flex-1`}
              onClick={() => del.mutate({ batchId: confirm.id }, { onSuccess: () => setConfirm(null) })}>
              {del.isPending ? 'Removing...' : 'Remove batch'}
            </button>
          </div>
        </Modal>)}
    </>
  );
}
