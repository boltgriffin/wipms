import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const Box = ({ title, note, empty, children }) => (
  <div className="rounded-lg border border-forest-100 bg-white p-4">
    <h2 className="text-sm font-semibold">{title}</h2>
    {note && <p className="mb-2 text-xs text-forest-700">{note}</p>}
    <div className="mt-2 h-64">{empty ? <p className="grid h-full place-items-center text-sm text-forest-700">No data yet</p> : <ResponsiveContainer>{children}</ResponsiveContainer>}</div>
  </div>
);
const day = (d) => d.slice(5);                                   // 2026-11-02 -> 11-02
const month = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

export function WeeklyAttendanceChart({ data = [] }) {
  const empty = !data.some((d) => d.present + d.late + d.halfDay + d.absent > 0);
  return (
    <Box title="Weekly attendance" note="Days logged per week, last 8 weeks" empty={empty}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" tickFormatter={day} /><YAxis allowDecimals={false} />
        <Tooltip labelFormatter={(l) => `Week of ${l}`} /><Legend />
        <Bar dataKey="present" name="Present" stackId="a" fill="#2F855A" /><Bar dataKey="late" name="Late" stackId="a" fill="#C8861D" />
        <Bar dataKey="halfDay" name="Half day" stackId="a" fill="#2B6CB0" /><Bar dataKey="absent" name="Absent" stackId="a" fill="#C53030" />
      </BarChart>
    </Box>
  );
}

export function MonthlyProgressChart({ data = [] }) {
  const empty = !data.some((d) => d.hours > 0 || d.attendanceRate != null);
  return (
    <Box title="Monthly progress" note="Hours rendered and attendance rate, last 6 months" empty={empty}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tickFormatter={month} />
        <YAxis yAxisId="h" /><YAxis yAxisId="r" orientation="right" domain={[0, 100]} unit="%" />
        <Tooltip labelFormatter={month} /><Legend />
        <Bar yAxisId="h" dataKey="hours" name="Hours rendered" fill="#1D4A41" radius={[3, 3, 0, 0]} />
        <Line yAxisId="r" type="monotone" dataKey="attendanceRate" name="Attendance rate (%)" stroke="#C8861D" strokeWidth={2} connectNulls />
      </ComposedChart>
    </Box>
  );
}

export function CompletionTrendChart({ data = [] }) {
  const empty = !data.some((d) => d.completionPct > 0);
  return (
    <Box title="Completion trend" note="Cumulative share of required hours completed, last 12 weeks" empty={empty}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" tickFormatter={day} /><YAxis domain={[0, 100]} unit="%" />
        <Tooltip labelFormatter={(l) => `Week of ${l}`} formatter={(v) => [`${v}%`, 'Completion']} />
        <Area type="monotone" dataKey="completionPct" stroke="#C8861D" fill="#C8861D" fillOpacity={0.25} strokeWidth={2} connectNulls />
      </AreaChart>
    </Box>
  );
}
