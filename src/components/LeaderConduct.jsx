import ConductSubmitForm from './ConductSubmitForm';
import { ConductBadge, dayOf, pts } from './conductUi';
import { useMySubmissions } from '../hooks/useConduct';

export default function LeaderConduct() {
  const d = useMySubmissions().data;
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-forest-100 bg-white p-5">
        <h2 className="mb-1 text-lg font-bold">Recommend a merit or report an infraction</h2>
        <p className="mb-4 text-sm text-forest-700">Your teacher reviews every submission before it changes anyone's conduct score.</p>
        <ConductSubmitForm />
      </div>
      <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-forest-100/60"><tr><th className="p-3">Date</th><th className="p-3">Student</th><th className="p-3">Type</th><th className="p-3 text-right">Points</th><th className="p-3">Status</th><th className="p-3">Teacher remarks</th></tr></thead>
        <tbody>
          {d?.items.map((r) => (
            <tr key={r.id} className="border-t border-forest-100"><td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3">{r.studentName}</td>
              <td className="p-3"><ConductBadge text={r.kind} /> {r.typeName}</td><td className="p-3 text-right">{pts(r.points)}</td><td className="p-3"><ConductBadge text={r.status} /></td><td className="p-3">{r.remarks || (r.reviewedAt ? '-' : `Sent ${dayOf(r.submittedAt)}`)}</td></tr>))}
          {d && !d.items.length && <tr><td className="p-6 text-center" colSpan={6}>You have not submitted anything yet.</td></tr>}
        </tbody></table></div>
    </section>
  );
}
