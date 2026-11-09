const TONE = { Completed: 'bg-green-100 text-green-800', Pending: 'bg-amber-100 text-amber-800', Incomplete: 'bg-red-100 text-red-800' };
export const CompletionPill = ({ status }) => <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONE[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
export const pct = (v) => (v == null ? '-' : `${v}%`);
export const nz = (v) => (v == null || v === '' ? '-' : v);
export const d10 = (iso) => (iso ? String(iso).slice(0, 10) : '-');

export function CriteriaList({ criteria }) {
  return (
    <ul className="divide-y divide-forest-100 rounded-lg border border-forest-100 bg-white">
      {criteria.map((c) => (
        <li key={c.key} className="flex items-start gap-3 p-3 text-sm">
          <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${c.met ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{c.met ? '✓' : '•'}</span>
          <div><p className="font-semibold">{c.label} <span className="sr-only">{c.met ? '(met)' : '(not met)'}</span></p><p className="text-forest-700">{c.detail}</p></div>
        </li>))}
    </ul>
  );
}
