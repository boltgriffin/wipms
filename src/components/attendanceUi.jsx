export const STATUSES = ['Present', 'Late', 'Absent', 'Half Day'];
const BADGE = { Present: 'bg-green-100 text-green-800', Late: 'bg-amber-100 text-amber-800', Absent: 'bg-red-100 text-red-800', 'Half Day': 'bg-blue-100 text-blue-800', 'No record': 'bg-gray-100 text-gray-600', Verified: 'bg-green-100 text-green-800', Disputed: 'bg-red-100 text-red-800' };

export function StatusBadge({ status }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${BADGE[status] || BADGE['No record']}`}>{status}</span>;
}
export function ProgressBar({ pct, label }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{pct}%</span></div>
      <div className="h-3 overflow-hidden rounded bg-forest-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
export function AttendanceTable({ records, showStudent }) {
  const hasV = !!records?.some((r) => 'verified' in r);
  if (!records?.length) return <p className="rounded border border-dashed border-forest-100 p-6 text-center text-sm text-forest-700">No attendance records yet.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-forest-100/60"><tr>
          <th className="p-3">Date</th>{showStudent && <th className="p-3">Student</th>}<th className="p-3">Time in</th><th className="p-3">Time out</th>
          <th className="p-3">Status</th><th className="p-3 text-right">Hours</th><th className="p-3">Remarks</th>{hasV && <th className="p-3">Verification</th>}
        </tr></thead>
        <tbody>{records.map((r, i) => (
          <tr key={r.id || i} className="border-t border-forest-100">
            <td className="p-3 whitespace-nowrap">{r.date}</td>{showStudent && <td className="p-3">{r.student}</td>}
            <td className="p-3">{r.timeIn || '-'}</td><td className="p-3">{r.timeOut || '-'}</td>
            <td className="p-3"><StatusBadge status={r.status} /></td><td className="p-3 text-right">{r.hours}</td><td className="p-3">{r.remarks}</td>{hasV && <td className="p-3">{r.verified ? <StatusBadge status={r.verified} /> : <span className="text-xs text-forest-700">Not verified</span>}</td>}
          </tr>))}
        </tbody>
      </table>
    </div>
  );
}
