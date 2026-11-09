import { useState } from 'react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui';
import { useSaveJournal } from '../hooks/useJournals';
import { prepareProof } from './proof';

const today = () => new Date().toLocaleDateString('en-CA');
const LIMITS = { activities: [20, 2000, 'Activities performed'], skills: [10, 1000, 'Skills learned'], problems: [2, 1000, 'Problems encountered'], reflection: [20, 2000, 'Reflection'] };

function validate(f) {
  const e = {};
  if (!f.date || f.date > today()) e.date = 'Choose today or an earlier date';
  Object.entries(LIMITS).forEach(([k, [min, max, label]]) => {
    const n = f[k].trim().length;
    if (n < min) e[k] = `${label} needs at least ${min} characters`; else if (n > max) e[k] = `${label} is too long (max ${max})`;
  });
  return e;
}

export default function JournalForm({ journal, onClose, onSaved }) {
  const edit = !!journal;
  const mut = useSaveJournal(edit);
  const [f, setF] = useState({ date: journal?.date || today(), activities: journal?.activities || '', skills: journal?.skills || '', problems: journal?.problems || '', reflection: journal?.reflection || '' });
  const [file, setFile] = useState(null);
  const [removeProof, setRemove] = useState(false);
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errs[k]) setErrs({ ...errs, [k]: undefined }); };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate(f); setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    let proof;
    try { if (file) proof = await prepareProof(file); } catch (err) { setErrs({ proof: err.message }); setBusy(false); return; }
    mut.mutate({ ...f, id: journal?.id, proof, removeProof: removeProof && !file }, {
      onSuccess: onSaved, onError: (err) => setErrs(err.fields || {}), onSettled: () => setBusy(false)
    });
  };
  const area = (k, rows) => (
    <Field label={LIMITS[k][2]} error={errs[k]} hint={`${f[k].length}/${LIMITS[k][1]}`}>
      <textarea rows={rows} maxLength={LIMITS[k][1]} value={f[k]} onChange={set(k)} className={`mt-1 ${inputCls}`} />
    </Field>
  );
  return (
    <Modal title={edit ? 'Revise journal' : 'New journal entry'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate className="space-y-4">
        {edit && journal.remarks && <p className="rounded bg-blue-50 p-3 text-sm"><strong>Your teacher wrote:</strong> {journal.remarks}</p>}
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <Field label="Date" error={errs.date}><input type="date" max={today()} value={f.date} onChange={set('date')} className={`mt-1 ${inputCls} sm:w-56`} /></Field>
        {area('activities', 4)}{area('skills', 3)}{area('problems', 3)}{area('reflection', 4)}
        <Field label="Proof attachment (optional)" error={errs.proof} hint="JPG, PNG or PDF. Photos are shrunk automatically; PDFs must be under 3 MB.">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(e) => { setFile(e.target.files[0] || null); setErrs({ ...errs, proof: undefined }); }} className="mt-1 block text-sm" />
        </Field>
        {edit && journal.hasProof && !file && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={removeProof} onChange={(e) => setRemove(e.target.checked)} />Remove current attachment ({journal.proofName})</label>
        )}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={busy || mut.isPending} className={btnPrimary}>{busy || mut.isPending ? 'Submitting...' : edit ? 'Resubmit for review' : 'Submit journal'}</button>
        </div>
      </form>
    </Modal>
  );
}
