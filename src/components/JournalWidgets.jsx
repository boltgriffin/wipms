import { Link } from 'react-router-dom';
import StatCard from './StatCard';
import { useJournalOverview } from '../hooks/useJournals';

export function StudentJournalCards() {
  const c = useJournalOverview().data?.counts;
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Journals</h2>
        <Link to="/student/journals" className="text-sm font-semibold text-amber-600 underline">Write or view journals</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={c?.total} /><StatCard label="Approved" value={c?.approved} />
        <StatCard label="Pending" value={c?.pending} /><StatCard label="Needs revision" value={c?.revision} />
      </div>
    </section>
  );
}

export function TeacherJournalPanel() {
  const d = useJournalOverview().data, c = d?.counts;
  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-3">
      <StatCard label="Pending journals" value={c?.pending} hint={c && `${c.revision} awaiting revision`} />
      <div className="rounded-lg border border-forest-100 bg-white p-5 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Review queue (oldest first)</h2>
          <Link to="/teacher/journals" className="text-sm font-semibold text-amber-600 underline">Open all</Link>
        </div>
        {d && !d.queue.length && <p className="text-sm text-forest-700">Nothing is waiting for review.</p>}
        <ul className="divide-y divide-forest-100 text-sm">
          {d?.queue.map((q) => (
            <li key={q.id} className="flex items-center justify-between py-2">
              <span><span className="font-medium">{q.studentName}</span> - {q.date}</span>
              <Link to={`/teacher/journals?review=${q.id}`} className="font-semibold text-amber-600 underline">Review</Link>
            </li>))}
        </ul>
      </div>
    </section>
  );
}
