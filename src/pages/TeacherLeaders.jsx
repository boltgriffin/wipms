import { useEffect, useState } from 'react';
import StatCard from '../components/StatCard';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { Pill, day, pc } from '../components/leaderUi';
import { useLeaderAction, useLeaderInstitution, useLeaderOverview } from '../hooks/useLeaders';
import { useAuthStore } from '../store/authStore';

function SettingsPanel({ s, admin }) {
  const save = useLeaderAction('/leaders/settings');
  const [f, setF] = useState({ threshold: s.threshold, minDays: s.minDays, termDays: s.termDays, autoRotate: s.autoRotate });
  const [ok, setOk] = useState(false);
  const err = save.error?.fields || {};
  const num = (k, label, hint) => <Field label={label} error={err[k]} hint={hint}><input type="number" disabled={!admin} value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setOk(false); }} className={`mt-1 ${inputCls}`} /></Field>;
  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">Rotation settings {admin ? '' : '(only an administrator can change these)'}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {num('threshold', 'Attendance threshold (%)', 'Minimum to be eligible')}{num('minDays', 'Minimum days logged', 'Stops one lucky day counting as 100%')}{num('termDays', 'Term length (days)', 'A term ends automatically')}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" disabled={!admin} checked={f.autoRotate} onChange={(e) => { setF({ ...f, autoRotate: e.target.checked }); setOk(false); }} />Automatically name a new leader when the seat is empty (needs the daily trigger)</label>
      <ErrorBanner error={save.error && !save.error.fields ? save.error : null} />
      {admin && <div className="mt-3 flex items-center gap-3"><button className={btnPrimary} disabled={save.isPending}
        onClick={() => save.mutate({ ...f, threshold: Number(f.threshold), minDays: Number(f.minDays), termDays: Number(f.termDays) }, { onSuccess: () => setOk(true) })}>{save.isPending ? 'Saving...' : 'Save settings'}</button>{ok && <span role="status" className="text-sm text-green-800">Saved.</span>}</div>}
    </section>
  );
}

export default function TeacherLeaders() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const ov = useLeaderOverview();
  const [sel, setSel] = useState('');
  const insts = ov.data?.institutions || [];
  const instId = sel || insts[0]?.institutionId || '';
  const q = useLeaderInstitution(instId);
  const d = q.data;
  const assign = useLeaderAction('/leaders/assign');
  const end = useLeaderAction('/leaders/end');
  const [dlg, setDlg] = useState(null); // {type:'auto'} | {type:'manual', cand} | {type:'end'}
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { setNotice(''); }, [instId]);

  const close = () => { setDlg(null); setReason(''); assign.reset(); end.reset(); };
  const confirm = () => {
    if (dlg.type === 'end') return end.mutate({ institutionId: instId, reason }, { onSuccess: () => { close(); setNotice('The leader\'s term was ended.'); } });
    assign.mutate({ institutionId: instId, mode: dlg.type, studentId: dlg.cand?.studentId, reason, replace: !!d.currentLeader }, {
      onSuccess: (r) => { close(); setNotice(`${r.term.studentName} is now the student leader${r.cycleReset ? '. All eligible students had served, so a new rotation cycle started.' : '.'}`); }
    });
  };
  const L = d?.currentLeader;
  const needReason = dlg?.type === 'manual' && dlg.cand.rank > 1;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Student leaders</h1>
      <ErrorBanner error={ov.error || q.error} />
      {ov.data && !insts.length && <p className="rounded border border-dashed border-forest-100 p-6 text-center text-sm">None of your students are assigned to an institution yet.</p>}
      {insts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium" htmlFor="inst">Institution</label>
          <select id="inst" value={instId} onChange={(e) => setSel(e.target.value)} className={`${inputCls} w-auto`}>
            {insts.map((i) => <option key={i.institutionId} value={i.institutionId}>{i.institutionName}</option>)}
          </select>
        </div>)}
      {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

      {d && <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Rotation cycle" value={`#${d.cycle.no}`} hint={`${d.cycle.served} of ${d.cycle.eligible} eligible students have served`} />
          <StatCard label="Eligible students" value={d.cycle.eligible} hint={`Attendance ${d.settings.threshold}% or higher, no active major infraction`} />
          <StatCard label="Next candidates" value={d.candidates.length} />
        </div>
        {d.wouldReset && <p className="rounded bg-blue-50 p-3 text-sm">Every eligible student has served in this cycle. A new cycle will start with the next assignment.</p>}

        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Current leader</h2>
          {L ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-lg font-bold">{L.studentName}</p>
                <p className="text-sm text-forest-700">Since {L.startDate}, term ends {L.plannedEndDate} - cycle {L.cycleNo} - <Pill text={L.method} /></p></div>
              <button className={btnGhost} onClick={() => setDlg({ type: 'end' })}>End term</button>
            </div>) : <p className="text-sm text-forest-700">No leader right now.</p>}
          <div className="mt-4"><button className={btnPrimary} disabled={!d.candidates.length} onClick={() => setDlg({ type: 'auto' })}>Assign automatically</button>
            {!d.candidates.length && <span className="ml-3 text-sm text-red-700">No eligible candidates right now.</span>}</div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold">Next eligible candidates</h2>
          <p className="mb-2 text-xs text-forest-700">Ranked by attendance, then fewest infractions, then journal completion, then never served, then earliest deployment.</p>
          <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
            <thead className="bg-forest-100/60"><tr><th className="p-3">Rank</th><th className="p-3">Student</th><th className="p-3 text-right">Attendance</th><th className="p-3 text-right">Infractions</th><th className="p-3 text-right">Journals</th><th className="p-3">Served before</th><th className="p-3">Deployed</th><th className="p-3" /></tr></thead>
            <tbody>
              {d.candidates.map((c) => (
                <tr key={c.studentId} className="border-t border-forest-100">
                  <td className="p-3 font-bold">{c.rank}</td><td className="p-3 font-medium">{c.name}</td><td className="p-3 text-right">{pc(c.attendanceRate)}</td><td className="p-3 text-right">{c.infractionCount}</td>
                  <td className="p-3 text-right">{pc(c.journalRate)}</td><td className="p-3">{c.neverServed ? 'Never' : `${c.timesServed} time(s)`}</td><td className="p-3">{day(c.deployedAt)}</td>
                  <td className="p-3 text-right"><button className="font-semibold text-amber-600 underline" onClick={() => setDlg({ type: 'manual', cand: c })}>Assign</button></td>
                </tr>))}
              {!d.candidates.length && <tr><td className="p-6 text-center" colSpan={8}>No one can be selected right now.</td></tr>}
            </tbody></table></div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-forest-100 bg-white p-5"><h2 className="mb-2 text-sm font-semibold">Not eligible</h2>
            {!d.ineligible.length && <p className="text-sm text-forest-700">Everyone deployed here is eligible.</p>}
            <ul className="divide-y divide-forest-100 text-sm">{d.ineligible.map((s) => <li key={s.studentId} className="py-2"><span className="font-medium">{s.name}</span><span className="block text-xs text-forest-700">{s.reasons.join('; ')}</span></li>)}</ul></section>
          <section className="rounded-lg border border-forest-100 bg-white p-5"><h2 className="mb-2 text-sm font-semibold">Already served this cycle</h2>
            {!d.servedThisCycle.length && <p className="text-sm text-forest-700">No one yet.</p>}
            <ul className="divide-y divide-forest-100 text-sm">{d.servedThisCycle.map((s) => <li key={s.studentId} className="py-2">{s.name}</li>)}</ul></section>
        </div>

        <section>
          <h2 className="mb-2 text-lg font-bold">Leader history</h2>
          <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
            <thead className="bg-forest-100/60"><tr><th className="p-3">Student</th><th className="p-3">Cycle</th><th className="p-3">Term</th><th className="p-3">How</th><th className="p-3">Status</th><th className="p-3">Rank / snapshot</th><th className="p-3">Notes</th></tr></thead>
            <tbody>
              {d.history.map((t) => (
                <tr key={t.id} className="border-t border-forest-100">
                  <td className="p-3 font-medium">{t.studentName}</td><td className="p-3">{t.cycleNo}</td><td className="p-3 whitespace-nowrap">{t.startDate} to {t.plannedEndDate}</td>
                  <td className="p-3"><Pill text={t.method} /><span className="block text-xs text-forest-700">{t.assignedBy}</span></td><td className="p-3"><Pill text={t.status} /></td>
                  <td className="p-3 text-xs">#{t.rank ?? '-'} - {pc(t.snapshot.attendance)} attendance, {t.snapshot.infractions} infraction(s), {pc(t.snapshot.journal)} journals</td>
                  <td className="p-3 text-xs">{[t.reason, t.endReason].filter(Boolean).join(' / ')}</td>
                </tr>))}
              {!d.history.length && <tr><td className="p-6 text-center" colSpan={7}>No leaders have been assigned yet.</td></tr>}
            </tbody></table></div>
        </section>
        <SettingsPanel key={JSON.stringify(d.settings)} s={d.settings} admin={admin} />
      </div>}

      {dlg && d && (
        <Modal title={dlg.type === 'end' ? 'End the leader\'s term?' : dlg.type === 'auto' ? 'Assign leader automatically?' : `Assign ${dlg.cand.name}?`} onClose={close}>
          <p className="text-sm">
            {dlg.type === 'end' && `${L.studentName} will stop being the leader and can no longer submit reports.`}
            {dlg.type === 'auto' && `The system picks the top-ranked candidate: ${d.candidates[0]?.name}.`}
            {dlg.type === 'manual' && `${dlg.cand.name} is ranked #${dlg.cand.rank}.`}
            {dlg.type !== 'end' && L && ` The current leader (${L.studentName}) will be replaced.`}
            {dlg.type !== 'end' && d.wouldReset && ' A new rotation cycle will start.'}
          </p>
          {(needReason || dlg.type === 'end' || dlg.type === 'auto') && (
            <div className="mt-3"><Field label={needReason ? 'Why not the top-ranked candidate?' : 'Note (optional)'} error={assign.error?.fields?.reason}>
              <textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputCls}`} /></Field></div>)}
          <div className="mt-3"><ErrorBanner error={(assign.error && !assign.error.fields ? assign.error : null) || end.error} /></div>
          <div className="mt-4 flex gap-3"><button className={`flex-1 ${btnGhost}`} onClick={close}>Cancel</button>
            <button className={`flex-1 ${btnPrimary}`} disabled={assign.isPending || end.isPending} onClick={confirm}>{assign.isPending || end.isPending ? 'Working...' : 'Confirm'}</button></div>
        </Modal>)}
    </>
  );
}
