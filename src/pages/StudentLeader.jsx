import { useState } from 'react';
import { ErrorBanner, Field, btnPrimary, inputCls } from '../components/ui';
import { Pill, day, pc } from '../components/leaderUi';
import LeaderConduct from '../components/LeaderConduct';
import { useLeaderAction, useLeaderStatus } from '../hooks/useLeaders';

function ReportForm({ classmates }) {
  const mut = useLeaderAction('/leader/report');
  const blank = { type: 'Observation', targetStudentId: '', severityHint: 'Unspecified', description: '' };
  const [f, setF] = useState(blank);
  const [done, setDone] = useState(false);
  const err = mut.error?.fields || {};
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setDone(false); };
  return (
    <form className="space-y-4 rounded-lg border border-forest-100 bg-white p-5" onSubmit={(e) => { e.preventDefault(); mut.mutate(f, { onSuccess: () => { setF(blank); setDone(true); } }); }}>
      <h2 className="text-lg font-bold">New report</h2>
      <ErrorBanner error={mut.error && !mut.error.fields ? mut.error : null} />
      {done && <p role="status" className="rounded bg-green-50 p-3 text-sm text-green-800">Report sent to your teacher.</p>}
      <Field label="Type" error={err.type}><select value={f.type} onChange={set('type')} className={`mt-1 ${inputCls}`}><option value="Observation">Observation</option><option value="Incident">Incident report</option><option value="Merit">Merit recommendation</option></select></Field>
      {f.type !== 'Observation' && (
        <Field label={f.type === 'Merit' ? 'Student you recommend' : 'Student involved (optional)'} error={err.targetStudentId}>
          <select value={f.targetStudentId} onChange={set('targetStudentId')} className={`mt-1 ${inputCls}`}><option value="">{f.type === 'Merit' ? 'Select' : 'None'}</option>{classmates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>)}
      {f.type === 'Incident' && <Field label="How serious was it?" error={err.severityHint}><select value={f.severityHint} onChange={set('severityHint')} className={`mt-1 ${inputCls}`}><option>Unspecified</option><option>Minor</option><option>Major</option></select></Field>}
      <Field label="Details" error={err.description} hint={`${f.description.length}/1000. Stick to facts: what happened, when and where.`}><textarea rows={4} maxLength={1000} value={f.description} onChange={set('description')} className={`mt-1 ${inputCls}`} /></Field>
      <div className="flex justify-end"><button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Sending...' : 'Send report'}</button></div>
    </form>
  );
}

export default function StudentLeader() {
  const { data: d, error, isLoading } = useLeaderStatus();
  const me = d?.myEligibility;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Student leader</h1>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      {d && !d.isLeader && (
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <p className="text-sm">You are not the student leader right now. Your teacher assigns the leader at {d.institutionName || 'your institution'}, rotating among eligible students.</p>
          {me ? <>
            <h2 className="mb-2 mt-4 text-sm font-semibold">Your eligibility</h2>
            <p className="text-sm">Attendance: <strong>{pc(me.attendanceRate)}</strong> (needs {d.threshold}% over at least {d.minDays} days; you have {me.daysLogged}). Infractions on record: {me.infractionCount}.</p>
            <p className="mt-2 text-sm">{me.eligible ? (me.servedThisCycle ? 'You are eligible but have already served in this rotation cycle.' : 'You are eligible to be chosen.') : `Not eligible yet: ${me.reasons.join('; ')}.`}</p>
          </> : <p className="mt-3 text-sm text-forest-700">You need to be an active student assigned to an institution.</p>}
        </section>)}
      {d?.isLeader && (
        <div className="space-y-6">
          <section className="rounded-lg border border-amber-500 bg-amber-50 p-5">
            <p className="font-bold">You are the student leader for {d.institutionName}</p>
            <p className="text-sm">Your term runs {d.term.startDate} to {d.term.plannedEndDate}.</p>
            <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
              <div><p className="font-semibold">You can</p><ul className="list-disc pl-5"><li>Submit observations</li><li>Submit incident reports</li><li>Recommend merits</li></ul></div>
              <div><p className="font-semibold">You cannot</p><ul className="list-disc pl-5"><li>Approve or edit attendance</li><li>Grade students</li><li>Approve evaluations</li></ul></div>
            </div>
          </section>
          <ReportForm classmates={d.classmates} />
          <LeaderConduct />
        </div>)}
      {d && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">My reports</h2>
          <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
            <thead className="bg-forest-100/60"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">About</th><th className="p-3">Details</th><th className="p-3">Status</th><th className="p-3">Teacher remarks</th></tr></thead>
            <tbody>
              {d.reports.map((r) => (
                <tr key={r.id} className="border-t border-forest-100"><td className="p-3 whitespace-nowrap">{day(r.createdAt)}</td><td className="p-3"><Pill text={r.type} /></td><td className="p-3">{r.targetName || '-'}</td>
                  <td className="p-3">{r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}</td><td className="p-3"><Pill text={r.status} /></td><td className="p-3">{r.remarks || '-'}</td></tr>))}
              {!d.reports.length && <tr><td className="p-6 text-center" colSpan={6}>No reports yet.</td></tr>}
            </tbody></table></div>
        </section>)}
    </>
  );
}
