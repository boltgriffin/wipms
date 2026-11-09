import { CategoryChart, ConductBadge, ScoreBreakdown, pts } from '../components/conductUi';
import { ErrorBanner } from '../components/ui';
import { useMyConduct } from '../hooks/useConduct';

export default function StudentConduct() {
  const { data: d, error, isLoading } = useMyConduct();
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">My conduct</h1>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      {d && <>
        <ScoreBreakdown base={d.base} s={d.score} />
        <p className="mt-2 text-xs text-forest-700">Conduct score = 100 + merits - infractions. Only approved records count.</p>
        <div className="mt-6"><CategoryChart data={d.byCategory} /></div>
        <h2 className="mb-3 mt-8 text-lg font-bold">Approved records</h2>
        <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
          <thead className="bg-forest-100/60"><tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3 text-right">Points</th><th className="p-3">Details</th><th className="p-3">Reviewed by</th></tr></thead>
          <tbody>
            {d.records.map((r) => (
              <tr key={r.id} className="border-t border-forest-100"><td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3"><ConductBadge text={r.kind} /> {r.typeName}</td>
                <td className="p-3 text-right font-semibold">{pts(r.points)}</td><td className="p-3">{r.description}{r.remarks && <span className="block text-xs text-forest-700">{r.remarks}</span>}</td><td className="p-3">{r.reviewedBy || '-'}</td></tr>))}
            {!d.records.length && <tr><td className="p-6 text-center" colSpan={5}>No merits or infractions yet. Your score is {d.base}.</td></tr>}
          </tbody></table></div>
      </>}
    </>
  );
}
