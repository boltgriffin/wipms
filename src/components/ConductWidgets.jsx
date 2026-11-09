import { Link } from 'react-router-dom';
import StatCard from './StatCard';
import { ConductBadge, pts } from './conductUi';
import { useConductOverview, useMyConduct } from '../hooks/useConduct';
import { useAuthStore } from '../store/authStore';

export function StudentConductCard() {
  const d = useMyConduct().data;
  if (!d) return null;
  return (
    <section className="mt-6 rounded-lg border border-forest-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Conduct score</h2><p className="text-xs text-forest-700">100 + merits - infractions</p></div>
        <p className="text-3xl font-bold">{d.score.score}</p>
        <p className="text-sm"><span className="text-green-700">+{d.score.merits} merits</span> / <span className="text-red-700">-{d.score.infractions} infractions</span></p>
        <Link to="/student/conduct" className="text-sm font-semibold text-amber-600 underline">Details</Link>
      </div>
    </section>
  );
}

export function TeacherConductPanel() {
  const role = useAuthStore((s) => s.user?.role);
  const d = useConductOverview().data, c = d?.cards, base = role === 'ADMIN' ? '/admin' : '/teacher';
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Conduct</h2><Link to={`${base}/conduct`} className="text-sm font-semibold text-amber-600 underline">Open merits and infractions</Link></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending reviews" value={c?.pending} /><StatCard label="Average conduct score" value={c?.avgScore ?? '-'} />
        <StatCard label="Merit points" value={c ? `+${c.meritPoints}` : '-'} /><StatCard label="Infraction points" value={c ? `-${c.infractionPoints}` : '-'} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-forest-100 bg-white p-5"><h3 className="mb-2 text-sm font-semibold">Lowest conduct scores</h3>
          {d && !d.lowest.length && <p className="text-sm text-forest-700">No students yet.</p>}
          <ul className="divide-y divide-forest-100 text-sm">{d?.lowest.map((s) => <li key={s.studentId} className="flex justify-between py-2"><span>{s.name}</span><strong>{s.score}</strong></li>)}</ul></div>
        <div className="rounded-lg border border-forest-100 bg-white p-5"><h3 className="mb-2 text-sm font-semibold">Waiting for your review</h3>
          {d && !d.queue.length && <p className="text-sm text-forest-700">Nothing is waiting.</p>}
          <ul className="divide-y divide-forest-100 text-sm">{d?.queue.map((r) => <li key={r.id} className="flex items-center justify-between py-2"><span>{r.studentName} - {r.typeName}</span><span className="flex items-center gap-2"><ConductBadge text={r.kind} />{pts(r.points)}</span></li>)}</ul></div>
      </div>
    </section>
  );
}
