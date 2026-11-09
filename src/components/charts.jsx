import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = { Present: '#2F855A', Late: '#C8861D', Absent: '#C53030', 'Half Day': '#2B6CB0' };
const Box = ({ title, children }) => (
  <div className="rounded-lg border border-forest-100 bg-white p-4">
    <h2 className="mb-3 text-sm font-semibold">{title}</h2>
    <div className="h-64">{children}</div>
  </div>
);
const Empty = () => <p className="grid h-full place-items-center text-sm text-forest-700">No data yet</p>;

export function StatusPie({ counts, title = 'Attendance by status' }) {
  const data = Object.entries(counts || {}).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  return (
    <Box title={title}>{data.length === 0 ? <Empty /> : (
      <ResponsiveContainer><PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>{data.map((d) => <Cell key={d.name} fill={COLORS[d.name]} />)}</Pie>
        <Tooltip /><Legend />
      </PieChart></ResponsiveContainer>)}
    </Box>
  );
}
export function HoursBar({ data, title = 'Hours rendered per day' }) {
  return (
    <Box title={title}>{!data?.length ? <Empty /> : (
      <ResponsiveContainer><BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} /><YAxis /><Tooltip />
        <Bar dataKey="hours" fill="#1D4A41" radius={[3, 3, 0, 0]} />
      </BarChart></ResponsiveContainer>)}
    </Box>
  );
}
export function RateBar({ students }) {
  return (
    <Box title="Attendance rate and completion per student (%)">{!students?.length ? <Empty /> : (
      <ResponsiveContainer><BarChart data={students}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Legend />
        <Bar dataKey="attendanceRate" name="Attendance rate" fill="#2F855A" /><Bar dataKey="completionPct" name="Completion" fill="#C8861D" />
      </BarChart></ResponsiveContainer>)}
    </Box>
  );
}
