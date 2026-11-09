import { useState } from 'react';
import { Info, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { SourceTag, StateTag } from '../components/dtrUi';
import { useDtrAction, useLeaderPanel } from '../hooks/useDtr';

/**
 * Level 3 of the hybrid flow. The current student leader records a classmate's time in or time out when
 * that classmate has no device. The leader never chooses the time: the server uses its own clock. A
 * reason is required, the day is tagged LEADER_RECORDED, and the teacher sees both on the DTR.
 */
export default function LeaderAttendance() {
  const { data, isLoading, error } = useLeaderPanel();
  const mut = useDtrAction('leaderRecord');
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState('');

  if (isLoading) return <p className="text-sm">Loading...</p>;
  if (error) {
    const notLeader = error.code === 'NOT_LEADER' || error.code === 'DISABLED';
    return (
      <>
        <h1 className="mb-4 text-2xl font-bold">Record attendance for a classmate</h1>
        <p role="status" className={`flex items-start gap-2 rounded-lg p-4 text-sm ${notLeader ? 'bg-blue-50' : 'bg-red-50 text-red-700'}`}>
          <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />{error.message}
        </p>
      </>
    );
  }

  const submit = () => {
    mut.mutate({ studentId: target.studentId, action: target.action, reason }, {
      onSuccess: (r) => {
        setDone(`${r.action === 'TIME_IN' ? 'Time In' : 'Time Out'} recorded for ${target.name} at ${r.time}.`);
        setTarget(null); setReason('');
      }
    });
  };

  const pending = data.students.filter((s) => s.action);
  const err = mut.error?.fields || {};

  return (
    <>
      <h1 className="text-2xl font-bold">Record attendance for a classmate</h1>
      <p className="mt-1 text-sm text-forest-700">
        You lead {data.institutionName} until {data.plannedEndDate || data.term?.plannedEndDate}. Use this only for a classmate who has no phone with them.
      </p>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        The time is taken from the school system, not from your phone, and every entry is marked as recorded by you. Your teacher reviews these before approving anyone&rsquo;s DTR.
      </p>
      {done && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{done}</p>}

      <h2 className="mb-3 mt-6 text-lg font-bold">{data.date}</h2>
      {!data.students.length && <p className="rounded-lg border border-dashed border-forest-100 p-6 text-center text-sm text-forest-700">No other students are deployed at your institution.</p>}

      <ul className="space-y-3">
        {data.students.map((s) => (
          <li key={s.studentId} className="rounded-xl border border-forest-100 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{s.name}</p>
                <p className="mt-0.5 text-xs text-forest-700">
                  {s.timeIn ? `In ${s.timeIn}` : 'No time in yet'}{s.timeOut ? ` · out ${s.timeOut} · ${s.hours} h` : ''}
                  {s.recordedBy ? ` · recorded by ${s.recordedBy}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StateTag state={s.state} />
                {s.source && <SourceTag source={s.source} />}
              </div>
            </div>
            {s.action ? (
              <button onClick={() => { setDone(''); setTarget(s); }}
                className={`mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${s.action === 'TIME_IN' ? 'bg-amber-500 text-forest-900 hover:bg-amber-600' : 'bg-forest-800 text-white hover:bg-forest-900'}`}>
                {s.action === 'TIME_IN' ? <LogIn size={15} aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
                {s.action === 'TIME_IN' ? 'Record Time In' : 'Record Time Out'}
              </button>
            ) : (
              <p className="mt-3 text-sm text-forest-700">{s.state === 'LOCKED' ? 'Their hours are complete and attendance is closed.' : 'Nothing to record today.'}</p>
            )}
          </li>))}
      </ul>

      {pending.length > 0 && <p className="mt-4 text-xs text-forest-700">{pending.length} classmate{pending.length === 1 ? '' : 's'} still waiting on an entry today.</p>}

      {target && (
        <Modal title={`${target.action === 'TIME_IN' ? 'Record Time In' : 'Record Time Out'} for ${target.name}`} onClose={() => { setTarget(null); setReason(''); }}>
          <p className="text-sm">The time will be taken from the school system the moment you confirm.</p>
          <div className="mt-4">
            <Field label="Why are you recording this for them?" error={err.reason} hint="For example: no phone with them today. At least 5 characters.">
              <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputCls}`} autoFocus />
            </Field>
          </div>
          <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
          <div className="mt-4 flex gap-3">
            <button onClick={() => { setTarget(null); setReason(''); }} className={`${btnGhost} flex-1`}>Cancel</button>
            <button disabled={mut.isPending} onClick={submit} className={`${btnPrimary} flex-1`}>{mut.isPending ? 'Recording...' : 'Confirm'}</button>
          </div>
        </Modal>)}
    </>
  );
}
