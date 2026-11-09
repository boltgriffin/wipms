import { Link } from 'react-router-dom';
import { useLeaderOverview, useLeaderStatus } from '../hooks/useLeaders';
import { useAuthStore } from '../store/authStore';

export function StudentLeaderBanner() {
  const d = useLeaderStatus().data;
  if (!d?.isLeader) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500 bg-amber-50 p-4">
      <p className="text-sm"><strong>You are the student leader</strong> for {d.institutionName} until {d.term.plannedEndDate}.</p>
      <Link to="/student/leader" className="text-sm font-semibold text-amber-600 underline">Open leader tools</Link>
    </div>
  );
}

export function TeacherLeaderPanel() {
  const role = useAuthStore((s) => s.user?.role);
  const d = useLeaderOverview().data;
  const base = role === 'ADMIN' ? '/admin' : '/teacher';
  return (
    <section className="mt-6 rounded-lg border border-forest-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Student leaders</h2>
        <Link to={`${base}/leaders`} className="text-sm font-semibold text-amber-600 underline">Manage rotation</Link>
      </div>
      {d && !d.institutions.length && <p className="text-sm text-forest-700">No institutions with your students yet.</p>}
      <ul className="divide-y divide-forest-100 text-sm">
        {d?.institutions.map((i) => (
          <li key={i.institutionId} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="font-medium">{i.institutionName}</span>
            {i.currentLeader
              ? <span>{i.currentLeader.studentName} <span className="text-forest-700">(until {i.currentLeader.plannedEndDate})</span></span>
              : <Link to={`${base}/leaders`} className="font-semibold text-amber-600 underline">No leader - assign</Link>}
          </li>))}
      </ul>
    </section>
  );
}
