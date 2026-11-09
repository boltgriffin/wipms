/**
 * The confirmation an administrator walks through before destroying something.
 *
 * Four steps, and the friction is the feature. The thing on the other side of this dialog is a
 * school year of attendance that four hundred students walked to a worksite to earn, and there is
 * no undo beyond the backup. So: see the real numbers, prove it is you, type the words, say yes.
 *
 * The numbers come first deliberately. A label like "Reset Students" is an abstraction; "542
 * students, 12,456 attendance rows, 10,321 journals" is the actual consequence, and it is counted
 * from the live sheets when the dialog opens rather than quoted from a page loaded an hour ago.
 *
 * The password is checked at its own step, so a typo is caught before anyone types the phrase
 * rather than after — the phrase is there to make someone stop and think, not to punish them.
 */
import { useState } from 'react';
import { AlertTriangle, Check, Loader2, ShieldAlert } from 'lucide-react';
import { Modal, btnGhost, inputCls } from './ui';
import { systemService } from '../services/systemService';
import { useAuthStore } from '../store/authStore';

const STEPS = ['What will happen', 'Confirm it is you', 'Type to confirm', 'Last check'];

export default function DangerDialog({
  title, phrase, actionLabel = 'Yes, do it', busy, error, onCancel, onConfirm,
  impact, impactLoading, summary, children
}) {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [checking, setChecking] = useState(false);
  const [pwError, setPwError] = useState('');

  const verify = async () => {
    setPwError(''); setChecking(true);
    try {
      await systemService.verifyPassword(useAuthStore.getState().token, { password });
      setStep(2);
    } catch (e) {
      setPwError(e.message);
    } finally { setChecking(false); }
  };

  const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const phraseOk = norm(typed) === norm(phrase);

  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel} wide>
      <ol className="mb-5 flex flex-wrap gap-2 text-xs" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
            i === step ? 'bg-forest-800 text-white' : i < step ? 'bg-green-100 text-green-800' : 'bg-forest-100/60 text-forest-700'}`}>
            {i < step ? <Check size={12} aria-hidden="true" /> : <span aria-hidden="true">{i + 1}</span>}{s}
          </li>))}
      </ol>

      {step === 0 && (
        <div>
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>This cannot be undone from inside the app. A backup is taken first and will appear in the
              backup list — that backup is the only way back.</span>
          </p>
          {impactLoading
            ? <p className="py-6 text-center text-sm">Counting what this would affect...</p>
            : impact && impact.length
              ? (<div className="overflow-hidden rounded-lg border border-forest-100">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Records that will be removed</caption>
                    <thead className="bg-forest-100/60 text-left text-xs uppercase tracking-wide">
                      <tr><th scope="col" className="p-2.5">Records</th><th scope="col" className="p-2.5 text-right">Rows</th><th scope="col" className="p-2.5">How</th></tr>
                    </thead>
                    <tbody className="divide-y divide-forest-100">
                      {impact.map((a) => (
                        <tr key={a.sheet + a.how}>
                          <td className="p-2.5 font-medium">{a.label || a.sheet}</td>
                          <td className="p-2.5 text-right font-mono">{a.rows.toLocaleString()}</td>
                          <td className="p-2.5 text-xs text-forest-700">{a.how || 'removed'}</td>
                        </tr>))}
                    </tbody>
                    <tfoot className="bg-forest-100/40">
                      <tr><td className="p-2.5 font-bold">Total</td>
                        <td className="p-2.5 text-right font-mono font-bold">{impact.reduce((n, a) => n + a.rows, 0).toLocaleString()}</td>
                        <td /></tr>
                    </tfoot>
                  </table>
                </div>)
              : <p className="rounded-lg bg-forest-100/50 p-4 text-sm">Nothing matches this — there is no data to remove.</p>}
          {children}
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onCancel} className={btnGhost}>Cancel</button>
            <button onClick={() => setStep(1)} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Continue</button>
          </div>
        </div>)}

      {step === 1 && (
        <div>
          <p className="mb-4 flex items-start gap-2 text-sm">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            Enter your own password. This is here so that someone who finds your screen unlocked cannot do this.
          </p>
          <label className="block text-sm font-medium" htmlFor="dd-pw">Your password</label>
          <input id="dd-pw" type="password" autoFocus className={`mt-1 ${inputCls}`} value={password}
            onChange={(e) => { setPassword(e.target.value); setPwError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && password) verify(); }} />
          {pwError && <p role="alert" className="mt-2 text-sm text-red-700">{pwError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setStep(0)} className={btnGhost}>Back</button>
            <button onClick={verify} disabled={!password || checking}
              className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {checking && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}Verify
            </button>
          </div>
        </div>)}

      {step === 2 && (
        <div>
          <p className="mb-4 text-sm">To confirm, type <span className="rounded bg-forest-100 px-1.5 py-0.5 font-mono font-bold">{phrase}</span> below.</p>
          <label className="sr-only" htmlFor="dd-phrase">Type {phrase}</label>
          <input id="dd-phrase" autoFocus autoComplete="off" spellCheck="false"
            className={`${inputCls} font-mono`} value={typed} placeholder={phrase}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && phraseOk) setStep(3); }} />
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setStep(1)} className={btnGhost}>Back</button>
            <button onClick={() => setStep(3)} disabled={!phraseOk}
              className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Continue</button>
          </div>
        </div>)}

      {step === 3 && (
        <div>
          <p className="mb-2 text-base font-bold">{summary || title}</p>
          <p className="mb-4 text-sm text-forest-700">
            A backup is taken first. If the backup fails for any reason, nothing is deleted.
          </p>
          {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error.message || String(error)}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onCancel} disabled={busy} className={btnGhost}>No, cancel</button>
            <button onClick={() => onConfirm({ password, confirmPhrase: typed, acknowledged: true })} disabled={busy}
              className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}{busy ? 'Working...' : actionLabel}
            </button>
          </div>
        </div>)}
    </Modal>
  );
}
