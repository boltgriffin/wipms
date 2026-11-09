import { useState } from 'react';
import { ConfirmDialog, ErrorBanner, Field, Modal, Pagination, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { Pill, day } from '../components/leaderUi';
import { useInfractions, useLeaderAction } from '../hooks/useLeaders';

const today = () => new Date().toLocaleDateString('en-CA');

function AddForm({ students, onClose }) {
  const mut = useLeaderAction('/infractions/create');
  const [f, setF] = useState({ studentId: '', severity: 'Minor', date: today(), description: '' });
  const err = mut.error?.fields || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Record infraction" onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); mut.mutate(f, { onSuccess: onClose }); }}>
        <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
        <Field label="Student" error={err.studentId}><select value={f.studentId} onChange={set('studentId')} className={`mt-1 ${inputCls}`}><option value="">Select</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Severity" error={err.severity}><select value={f.severity} onChange={set('severity')} className={`mt-1 ${inputCls}`}><option>Minor</option><option>Major</option></select></Field>
          <Field label="Date" error={err.date}><input type="date" max={today()} value={f.date} onChange={set('date')} className={`mt-1 ${inputCls}`} /></Field>
        </div>
        {f.severity === 'Major' && <p className="rounded bg-red-50 p-3 text-xs text-red-700">An active major infraction disqualifies the student from being leader, and ends their term if they are the current leader.</p>}
        <Field label="What happened" error={err.description} hint={`${f.description.length}/500`}><textarea rows={3} maxLength={500} value={f.description} onChange={set('description')} className={`mt-1 ${inputCls}`} /></Field>
        <div className="flex justify-end gap-3"><button type="button" className={btnGhost} onClick={onClose}>Cancel</button><button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Saving...' : 'Record'}</button></div>
      </form>
    </Modal>
  );
}

export default function Infractions() {
  const [f, setF] = useState({ status: '', severity: '', studentId: '' });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const q = useInfractions({ ...f, page, pageSize: 10 });
  const resolve = useLeaderAction('/infractions/resolve');
  const d = q.data;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Infractions</h1>
        {d && <button className={btnPrimary} onClick={() => setModal({ type: 'add' })}>Record infraction</button>}</div>
      <ErrorBanner error={q.error} />
      <div className="mb-3 flex flex-wrap gap-3">
        <select aria-label="Student" value={f.studentId} onChange={set('studentId')} className={`${inputCls} w-auto`}><option value="">All students</option>{d?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select aria-label="Status" value={f.status} onChange={set('status')} className={`${inputCls} w-auto`}><option value="">Any status</option><option>Active</option><option>Resolved</option></select>
        <select aria-label="Severity" value={f.severity} onChange={set('severity')} className={`${inputCls} w-auto`}><option value="">Any severity</option><option>Minor</option><option>Major</option></select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-forest-100/60"><tr><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Severity</th><th className="p-3">Description</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
        <tbody>
          {q.isLoading && <tr><td className="p-4" colSpan={6}>Loading...</td></tr>}
          {d?.items.map((i) => (
            <tr key={i.id} className="border-t border-forest-100"><td className="p-3 whitespace-nowrap">{i.date}</td><td className="p-3 font-medium">{i.studentName}</td><td className="p-3"><Pill text={i.severity} /></td>
              <td className="p-3">{i.description}<span className="block text-xs text-forest-700">By {i.recordedBy}{i.fromReport ? ' (from a leader report)' : ''}</span></td>
              <td className="p-3"><Pill text={i.status} />{i.status === 'Resolved' && <span className="block text-xs text-forest-700">{day(i.resolvedAt)} {i.resolvedBy}</span>}</td>
              <td className="p-3 text-right">{i.status === 'Active' && <button className="font-semibold text-amber-600 underline" onClick={() => { resolve.reset(); setModal({ type: 'resolve', i }); }}>Resolve</button>}</td></tr>))}
          {d && !d.items.length && <tr><td className="p-6 text-center" colSpan={6}>No infractions recorded.</td></tr>}
        </tbody></table></div>
      {d && <Pagination page={d.page} pages={d.pages} total={d.total} onPage={setPage} />}
      {modal?.type === 'add' && <AddForm students={d.students} onClose={() => setModal(null)} />}
      {modal?.type === 'resolve' && <ConfirmDialog title="Resolve infraction?" confirmLabel="Resolve" busy={resolve.isPending} error={resolve.error} onCancel={() => setModal(null)}
        text={`Mark the ${modal.i.severity.toLowerCase()} infraction for ${modal.i.studentName} as resolved? It stops disqualifying them from leadership but still counts in their infraction total.`}
        onConfirm={() => resolve.mutate({ id: modal.i.id }, { onSuccess: () => setModal(null) })} />}
    </>
  );
}
