import { useState } from 'react';
import { ConfirmDialog, ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui';
import { CATS, SCALE } from './supervisorUi';
import { useAction } from '../hooks/useSupervisor';

const today = () => new Date().toLocaleDateString('en-CA');

export default function EvaluationForm({ student, summary, evaluation, onClose, onSaved }) {
  const mut = useAction('/supervisor/evaluation/save');
  const [f, setF] = useState({ type: evaluation?.type || 'Midterm', date: evaluation?.date || today(), scores: { ...(evaluation?.scores || {}) }, comments: evaluation?.comments || '' });
  const [errs, setErrs] = useState({});
  const [confirm, setConfirm] = useState(false);
  const hint = { attendance: summary?.attendanceRate != null ? `System record: ${summary.attendanceRate}% attendance rate` : 'No attendance record yet', punctuality: summary ? `System record: ${summary.daysLate} late day(s)` : '' };

  const check = (submit) => {
    const e = {};
    if (!f.date || f.date > today()) e.date = 'Choose today or an earlier date';
    if (submit && CATS.some(([k]) => !f.scores[k])) e.scores = 'Score all six categories before submitting';
    if (submit && f.comments.trim().length < 10) e.comments = 'Add comments (at least 10 characters) before submitting';
    setErrs(e); return !Object.keys(e).length;
  };
  const send = (submit) => mut.mutate({ id: evaluation?.id, studentId: student.studentId, ...f, submit }, { onSuccess: (r) => onSaved(r, submit), onError: (err) => { setConfirm(false); setErrs(err.fields || {}); } });
  const save = (submit) => { if (!check(submit)) return; if (submit) setConfirm(true); else send(false); };

  return (
    <Modal title={`${evaluation ? 'Edit' : 'New'} evaluation - ${student.name}`} onClose={onClose} wide>
      <div className="space-y-4">
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Evaluation type" error={errs.type}>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={`mt-1 ${inputCls}`}><option>Midterm</option><option>Final</option><option>Periodic</option></select></Field>
          <Field label="Date" error={errs.date}><input type="date" max={today()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={`mt-1 ${inputCls}`} /></Field>
        </div>
        <p className="text-xs text-forest-700">Scale: 1 Poor, 2 Needs improvement, 3 Satisfactory, 4 Very satisfactory, 5 Outstanding.</p>
        {errs.scores && <p role="alert" className="text-sm text-red-700">{errs.scores}</p>}
        {CATS.map(([k, label]) => (
          <fieldset key={k} className="rounded border border-forest-100 p-3">
            <legend className="px-1 text-sm font-semibold">{label}</legend>
            <div className="flex flex-wrap gap-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex items-center gap-1 text-sm" title={SCALE[n]}>
                  <input type="radio" name={k} checked={f.scores[k] === n} onChange={() => setF({ ...f, scores: { ...f.scores, [k]: n } })} />{n}
                </label>))}
              <span className="text-xs text-forest-700">{f.scores[k] ? SCALE[f.scores[k]] : ''}</span>
            </div>
            {hint[k] && <p className="mt-1 text-xs text-forest-700">{hint[k]}</p>}
          </fieldset>))}
        <Field label="Comments" error={errs.comments} hint={`${f.comments.length}/1000`}>
          <textarea rows={4} maxLength={1000} value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} className={`mt-1 ${inputCls}`} /></Field>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="button" disabled={mut.isPending} onClick={() => save(false)} className={btnGhost}>Save draft</button>
          <button type="button" disabled={mut.isPending} onClick={() => save(true)} className={btnPrimary}>Submit evaluation</button>
        </div>
      </div>
      {confirm && <ConfirmDialog title="Submit evaluation?" confirmLabel="Submit" busy={mut.isPending} error={mut.error && !mut.error.fields ? mut.error : null}
        text="Once submitted, the evaluation is locked and becomes visible to the student and their teacher. You cannot edit it afterwards." onCancel={() => setConfirm(false)} onConfirm={() => send(true)} />}
    </Modal>
  );
}
