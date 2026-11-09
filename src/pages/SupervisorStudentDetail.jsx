import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import EvaluationForm from '../components/EvaluationForm';
import { StatusBadge } from '../components/attendanceUi';
import { ConfirmDialog, ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { EvaluationCard, EvaluationSummary, FeedbackList, Tag } from '../components/supervisorUi';
import { useAction, useSupStudent } from '../hooks/useSupervisor';

const eligible = (r) => r.status !== 'Absent' && !!r.timeOut;

export default function SupervisorStudentDetail() {
  const { id } = useParams();
  const { data: d, error, isLoading } = useSupStudent(id);
  const [tab, setTab] = useState('attendance');
  const [sel, setSel] = useState([]);
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null); // {type:'dispute'|'eval'|'delete', evaluation?}
  const [remarks, setRemarks] = useState('');
  const [remErr, setRemErr] = useState('');
  const [msg, setMsg] = useState('');
  const verify = useAction('/supervisor/attendance/verify');
  const del = useAction('/supervisor/evaluation/delete');
  const fb = useAction('/supervisor/feedback');
  const st = d?.student, sm = d?.summary;
  const unverified = (d?.attendance || []).filter((r) => eligible(r) && !r.verified).map((r) => r.id);

  const run = (decision, text) => verify.mutate({ ids: sel, decision, remarks: text }, {
    onSuccess: (r) => { setSel([]); setModal(null); setRemarks(''); setNotice(`${r.updated} record(s) ${decision === 'verify' ? 'verified' : 'disputed'}${r.skipped ? `, ${r.skipped} skipped` : ''}.`); },
    onError: (e) => setRemErr(e.fields?.remarks || '')
  });
  const toggle = (rid) => setSel(sel.includes(rid) ? sel.filter((x) => x !== rid) : [...sel, rid]);
  const tabBtn = (k, label) => <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-forest-800 text-white' : 'border border-forest-100 bg-white'}`}>{label}</button>;

  return (
    <>
      <Link to="/supervisor/students" className="text-sm font-semibold text-amber-600 underline">Back to students</Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">{st?.name || 'Student'}</h1>
      {st && <p className="mb-6 text-sm text-forest-700">{st.studentId} - Grade {st.gradeLevel} {st.strand} {st.section} - {st.institutionName}</p>}
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      {d && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Hours rendered" value={st.hasAccount ? `${sm.hours} / ${sm.requiredHours}` : '-'} />
          <StatCard label="Attendance rate" value={sm.attendanceRate != null ? `${sm.attendanceRate}%` : '-'} />
          <StatCard label="Late days" value={sm.daysLate} /><StatCard label="Awaiting verification" value={sm.pendingVerification} />
        </div>
        <div role="tablist" className="mb-4 mt-6 flex flex-wrap gap-2">{tabBtn('attendance', 'Attendance verification')}{tabBtn('evaluations', 'Evaluations')}{tabBtn('feedback', 'Feedback')}</div>

        {tab === 'attendance' && <>
          {notice && <p role="status" className="mb-3 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
          {!st.hasAccount && <p className="mb-3 rounded bg-amber-50 p-3 text-sm">This student has no login account yet, so there is no attendance to verify.</p>}
          <ErrorBanner error={verify.error && !verify.error.fields ? verify.error : null} />
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button className={btnGhost} onClick={() => setSel(sel.length ? [] : unverified)} disabled={!unverified.length && !sel.length}>{sel.length ? 'Clear selection' : `Select all unverified (${unverified.length})`}</button>
            <button className={btnPrimary} disabled={!sel.length || verify.isPending} onClick={() => run('verify', '')}>Verify selected ({sel.length})</button>
            <button className="rounded border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={!sel.length} onClick={() => { setRemErr(''); setModal({ type: 'dispute' }); }}>Dispute selected</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest-100/60"><tr><th className="p-3" /><th className="p-3">Date</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3 text-right">Hours</th><th className="p-3">Status</th>
                <th className="p-3">GPS distance (in / out)</th><th className="p-3">Verification</th></tr></thead>
              <tbody>
                {d.attendance.map((r) => (
                  <tr key={r.id} className="border-t border-forest-100">
                    <td className="p-3"><input type="checkbox" aria-label={`Select ${r.date}`} disabled={!eligible(r)} checked={sel.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3">{r.timeIn || '-'}</td><td className="p-3">{r.timeOut || (r.status === 'Absent' ? '-' : 'No time out')}</td>
                    <td className="p-3 text-right">{r.hours}</td><td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3">{r.inDistance != null ? `${r.inDistance} m` : '-'} / {r.outDistance != null ? `${r.outDistance} m` : '-'}</td>
                    <td className="p-3">{r.verified ? <Tag text={r.verified} /> : <span className="text-xs text-forest-700">{eligible(r) ? 'Not verified' : 'Not eligible'}</span>}{r.verifyRemarks && <span className="block text-xs text-forest-700">{r.verifyRemarks}</span>}</td>
                  </tr>))}
                {!d.attendance.length && <tr><td className="p-6 text-center" colSpan={8}>No attendance records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {tab === 'evaluations' && <>
          <div className="mb-4 flex justify-end"><button className={btnPrimary} onClick={() => setModal({ type: 'eval' })}>New evaluation</button></div>
          <EvaluationSummary s={d.evalSummary} />
          <h2 className="mb-3 mt-6 text-lg font-bold">Evaluations</h2>
          <div className="space-y-4">
            {d.evaluations.map((e) => (
              <div key={e.id}>
                <EvaluationCard e={e} />
                {e.status === 'Draft' && e.mine && <div className="mt-2 flex gap-3"><button className={btnGhost} onClick={() => setModal({ type: 'eval', evaluation: e })}>Edit draft</button>
                  <button className="rounded border border-red-700 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => { del.reset(); setModal({ type: 'delete', evaluation: e }); }}>Delete draft</button></div>}
              </div>))}
            {!d.evaluations.length && <p className="text-sm text-forest-700">No evaluations yet.</p>}
          </div>
        </>}

        {tab === 'feedback' && <>
          <form className="mb-6 rounded-lg border border-forest-100 bg-white p-4" onSubmit={(e) => { e.preventDefault(); fb.mutate({ studentId: id, message: msg }, { onSuccess: () => { setMsg(''); setNotice('Feedback sent.'); } }); }}>
            <Field label="Feedback for the student" error={fb.error?.fields?.message} hint="Visible to the student and their teacher."><textarea rows={3} maxLength={1000} value={msg} onChange={(e) => setMsg(e.target.value)} className={`mt-1 ${inputCls}`} /></Field>
            <ErrorBanner error={fb.error && !fb.error.fields ? fb.error : null} />
            {notice === 'Feedback sent.' && <p role="status" className="mt-2 text-sm text-green-800">Feedback sent.</p>}
            <div className="mt-3 flex justify-end"><button disabled={fb.isPending || msg.trim().length < 5} className={btnPrimary}>{fb.isPending ? 'Sending...' : 'Send feedback'}</button></div>
          </form>
          <FeedbackList items={d.feedback} />
        </>}
      </>}

      {modal?.type === 'dispute' && (
        <Modal title="Dispute attendance" onClose={() => setModal(null)}>
          <Field label="Reason" error={remErr} hint="Tell the teacher what looks wrong (at least 5 characters)."><textarea rows={3} maxLength={300} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} /></Field>
          <div className="mt-4 flex gap-3"><button className={`flex-1 ${btnGhost}`} onClick={() => setModal(null)}>Cancel</button>
            <button disabled={verify.isPending} className={`flex-1 ${btnPrimary}`} onClick={() => remarks.trim().length < 5 ? setRemErr('Explain the dispute (at least 5 characters)') : run('dispute', remarks)}>Dispute {sel.length} record(s)</button></div>
        </Modal>)}
      {modal?.type === 'eval' && st && (
        <EvaluationForm student={st} summary={sm} evaluation={modal.evaluation} onClose={() => setModal(null)}
          onSaved={(r, submitted) => { setModal(null); setTab('evaluations'); setNotice(submitted ? 'Evaluation submitted.' : 'Draft saved.'); }} />)}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Delete draft?" text="This draft will be removed permanently." confirmLabel="Delete" busy={del.isPending} error={del.error}
          onCancel={() => setModal(null)} onConfirm={() => del.mutate({ id: modal.evaluation.id }, { onSuccess: () => setModal(null) })} />)}
    </>
  );
}
