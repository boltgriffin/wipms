import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TONE = { Pending: 'bg-amber-100 text-amber-800', Approved: 'bg-green-100 text-green-800', Rejected: 'bg-red-100 text-red-800', Merit: 'bg-green-100 text-green-800', Infraction: 'bg-red-100 text-red-800' };
export const ConductBadge = ({ text }) => <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONE[text] || 'bg-gray-100 text-gray-700'}`}>{text}</span>;
export const pts = (n) => (n > 0 ? `+${n}` : String(n));
export const dayOf = (iso) => (iso ? String(iso).slice(0, 10) : '');

export function ScoreBreakdown({ base = 100, s }) {
  const Tile = ({ k, v, cls }) => <div className="rounded border border-forest-100 bg-white p-3 text-center"><p className="text-xs text-forest-700">{k}</p><p className={`text-2xl font-bold ${cls || ''}`}>{v}</p></div>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile k="Starting score" v={base} /><Tile k="Merits" v={`+${s.merits}`} cls="text-green-700" /><Tile k="Infractions" v={`-${s.infractions}`} cls="text-red-700" /><Tile k="Conduct score" v={s.score} />
    </div>
  );
}

export function CategoryChart({ data }) {
  if (!data?.length) return null;
  const bars = data.map((d) => ({ name: d.kind === 'Merit' ? `Merit: ${d.category}` : d.category, points: d.points }));
  return (
    <div className="rounded-lg border border-forest-100 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">Points by category</h3>
      <div className="h-56"><ResponsiveContainer><BarChart data={bars}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
        <Bar dataKey="points" name="Points">{bars.map((b) => <Cell key={b.name} fill={b.points >= 0 ? '#2F855A' : '#C53030'} />)}</Bar>
      </BarChart></ResponsiveContainer></div>
    </div>
  );
}
