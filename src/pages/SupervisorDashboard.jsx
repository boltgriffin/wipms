import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { ErrorBanner } from '../components/ui';
import { Tag } from '../components/supervisorUi';
import { useSupOverview } from '../hooks/useSupervisor';

export default function SupervisorDashboard() {
  const { data: d, error, isLoading } = useSupOverview();
  const c = d?.cards;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Supervisor dashboard</h1>
        <Link to="/supervisor/students" className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600">View assigned students</Link>
      </div>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned students" value={c?.assignedStudents} />
        <StatCard label="Attendance to verify" value={c?.pendingVerifications} hint="Completed days not yet verified" />
        <StatCard label="Evaluations submitted" value={c?.evaluationsSubmitted} hint={c && `${c.drafts} draft(s)`} />
        <StatCard label="Awaiting first evaluation" value={c?.awaitingEvaluation} />
      </div>
      {d && c.assignedStudents === 0 && <p className="mt-4 rounded bg-amber-50 p-3 text-sm">No students are assigned to your institution yet. Ask the school administrator or teacher to assign students.</p>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">Needs attendance verification</h2>
          {d && !d.verifyQueue.length && <p className="text-sm text-forest-700">Everything is verified.</p>}
          <ul className="divide-y divide-forest-100 text-sm">{d?.verifyQueue.map((q) => (
            <li key={q.studentId} className="flex items-center justify-between py-2"><span><span className="font-medium">{q.name}</span> - {q.pending} day(s)</span>
              <Link className="font-semibold text-amber-600 underline" to={`/supervisor/students/${q.studentId}`}>Verify</Link></li>))}
          </ul>
        </section>
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recent evaluations</h2>
            <Link to="/supervisor/evaluations" className="text-sm font-semibold text-amber-600 underline">History</Link></div>
          {d && !d.recent.length && <p className="text-sm text-forest-700">No evaluations submitted yet.</p>}
          <ul className="divide-y divide-forest-100 text-sm">{d?.recent.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2"><span><span className="font-medium">{e.studentName}</span> - {e.type}, {e.date}</span>
              <span className="flex items-center gap-2"><Tag text={e.rating} /><strong>{e.average}</strong></span></li>))}
          </ul>
        </section>
      </div>
    </>
  );
}
