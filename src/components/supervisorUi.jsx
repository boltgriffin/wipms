import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import StatCard from './StatCard';

export const CATS = [['professionalism', 'Professionalism'], ['attendance', 'Attendance'], ['punctuality', 'Punctuality'], ['communication', 'Communication'], ['workEthics', 'Work Ethics'], ['technicalSkills', 'Technical Skills']];
export const SCALE = { 1: 'Poor', 2: 'Needs improvement', 3: 'Satisfactory', 4: 'Very satisfactory', 5: 'Outstanding' };
const TONE = {
  Outstanding: 'bg-green-100 text-green-800', 'Very Satisfactory': 'bg-emerald-100 text-emerald-800', Satisfactory: 'bg-amber-100 text-amber-800',
  'Needs Improvement': 'bg-orange-100 text-orange-800', Poor: 'bg-red-100 text-red-800', Draft: 'bg-gray-100 text-gray-700', Submitted: 'bg-blue-100 text-blue-800',
  Verified: 'bg-green-100 text-green-800', Disputed: 'bg-red-100 text-red-800'
};
export const Tag = ({ text }) => <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONE[text] || 'bg-gray-100 text-gray-700'}`}>{text}</span>;
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '');

export function ScoreRow({ label, value }) {
  return (
    <div className="flex items-center gap-3 py-1 text-sm">
      <span className="w-36 shrink-0">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-forest-100"><div className="h-full bg-amber-500" style={{ width: `${((value || 0) / 5) * 100}%` }} /></div>
      <span className="w-28 text-right">{value ? `${value} - ${SCALE[value]}` : 'Not scored'}</span>
    </div>
  );
}
export function EvaluationCard({ e }) {
  return (
    <article className="rounded-lg border border-forest-100 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div><p className="font-bold">{e.type} evaluation <span className="font-normal text-forest-700">- {e.date}</span></p>
          <p className="text-xs text-forest-700">{e.supervisorName}{e.institutionName ? `, ${e.institutionName}` : ''}</p></div>
        <div className="flex items-center gap-2"><Tag text={e.status} />{e.rating && <Tag text={e.rating} />}{e.average != null && <span className="text-sm font-bold">{e.average}/5</span>}</div>
      </div>
      {CATS.map(([k, l]) => <ScoreRow key={k} label={l} value={e.scores[k]} />)}
      <p className="mt-3 whitespace-pre-wrap text-sm"><strong>Comments:</strong> {e.comments || '-'}</p>
    </article>
  );
}
export function FeedbackList({ items }) {
  if (!items?.length) return <p className="text-sm text-forest-700">No feedback yet.</p>;
  return (
    <ul className="space-y-3">{items.map((f) => (
      <li key={f.id} className="rounded border border-forest-100 bg-white p-3 text-sm">
        <p className="whitespace-pre-wrap">{f.message}</p><p className="mt-1 text-xs text-forest-700">{f.supervisorName} - {fmtDate(f.createdAt)}</p>
      </li>))}
    </ul>
  );
}
export function EvaluationSummary({ s }) {
  if (!s || !s.count) return <p className="rounded border border-dashed border-forest-100 p-6 text-center text-sm text-forest-700">No submitted evaluations yet.</p>;
  const bars = CATS.map(([k, l]) => ({ name: l, score: s.categories[k] }));
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overall average" value={`${s.average} / 5`} /><StatCard label="Rating" value={s.rating} /><StatCard label="Evaluations" value={s.count} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-forest-100 bg-white p-4"><h3 className="mb-2 text-sm font-semibold">Average score by category</h3>
          <div className="h-64"><ResponsiveContainer><BarChart data={bars} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} /><YAxis type="category" dataKey="name" width={110} />
            <Tooltip /><Bar dataKey="score" name="Average" fill="#1D4A41" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="rounded-lg border border-forest-100 bg-white p-4"><h3 className="mb-2 text-sm font-semibold">Average score over time</h3>
          <div className="h-64"><ResponsiveContainer><LineChart data={s.trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
            <Tooltip labelFormatter={(d, p) => `${p?.[0]?.payload?.type || ''} ${d}`} /><Line type="monotone" dataKey="average" name="Average" stroke="#C8861D" strokeWidth={2} dot /></LineChart></ResponsiveContainer></div></div>
      </div>
    </div>
  );
}
