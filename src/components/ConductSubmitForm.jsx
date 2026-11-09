import { useState } from 'react';
import { ErrorBanner, Field, btnPrimary, inputCls } from './ui';
import { useConductAction, useConductMeta } from '../hooks/useConduct';
import { pts } from './conductUi';

const today = () => new Date().toLocaleDateString('en-CA');

// Used by teachers (in a dialog) and by the student leader (inline). The server decides who may write about whom.
export default function ConductSubmitForm({ staff, onDone }) {
  const { data: meta, isLoading } = useConductMeta();
  const mut = useConductAction('/conduct/submit');
  const [f, setF] = useState({ kind: 'Infraction', typeId: '', points: 1, studentId: '', date: today(), description: '', approveNow: false });
  const [msg, setMsg] = useState('');
  const err = mut.error?.fields || {};
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setMsg(''); };
  const types = (meta?.types || []).filter((t) => t.kind === f.kind);
  const merit = f.kind === 'Merit';
  const submit = (e) => {
    e.preventDefault();
    mut.mutate({ ...f, points: merit ? Number(f.points) : undefined, approveNow: staff && f.approveNow }, {
      onSuccess: (r) => { setF({ ...f, typeId: '', description: '', approveNow: false }); setMsg(r.status === 'Approved' ? 'Recorded and approved.' : 'Submitted for teacher review.'); onDone?.(r); }
    });
  };
  if (isLoading) return <p className="text-sm">Loading...</p>;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
      {msg && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
      <fieldset className="flex gap-6"><legend className="mb-1 text-sm font-medium">Record type</legend>
        {['Infraction', 'Merit'].map((k) => <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" name="kind" checked={f.kind === k} onChange={() => setF({ ...f, kind: k, typeId: '' })} />{k}</label>)}
      </fieldset>
      <Field label="Student" error={err.studentId}>
        <select value={f.studentId} onChange={set('studentId')} className={`mt-1 ${inputCls}`}><option value="">Select</option>{meta?.students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={merit ? 'Merit category' : 'Infraction'} error={err.typeId}>
          <select value={f.typeId} onChange={set('typeId')} className={`mt-1 ${inputCls}`}><option value="">Select</option>
            {types.map((t) => <option key={t.typeId} value={t.typeId}>{merit ? t.name : `${t.category} - ${t.name} (${pts(t.points)})`}</option>)}</select></Field>
        {merit
          ? <Field label="Merit points" error={err.points}><select value={f.points} onChange={set('points')} className={`mt-1 ${inputCls}`}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>+{n}</option>)}</select></Field>
          : <Field label="Date" error={err.date}><input type="date" max={today()} value={f.date} onChange={set('date')} className={`mt-1 ${inputCls}`} /></Field>}
      </div>
      {merit && <Field label="Date" error={err.date}><input type="date" max={today()} value={f.date} onChange={set('date')} className={`mt-1 ${inputCls} sm:w-56`} /></Field>}
      <Field label={merit ? 'Reason for the merit' : 'What happened'} error={err.description} hint={`${f.description.length}/500`}>
        <textarea rows={3} maxLength={500} value={f.description} onChange={set('description')} className={`mt-1 ${inputCls}`} /></Field>
      {staff && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.approveNow} onChange={(e) => setF({ ...f, approveNow: e.target.checked })} />Approve immediately (recorded under your name)</label>}
      <div className="flex justify-end"><button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Sending...' : staff && f.approveNow ? 'Record' : 'Submit for review'}</button></div>
    </form>
  );
}
