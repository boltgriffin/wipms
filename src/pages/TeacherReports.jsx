import { useState } from 'react';
import { AttendanceTable } from '../components/attendanceUi';
import { useAttendanceStore } from '../store/attendanceStore';

const safe = (v) => { const s = String(v ?? ''); return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };

export default function TeacherReports() {
  const { report, loadReport, loading, error } = useAttendanceStore();
  const [type, setType] = useState('daily');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [month, setMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const load = (e) => { e.preventDefault(); loadReport(type === 'daily' ? { type, date } : { type, month }); };
  const exportCsv = () => {
    const head = ['Date', 'Student', 'Time in', 'Time out', 'Status', 'Hours', 'Remarks'];
    const lines = report.rows.map((r) => [r.date, r.student, r.timeIn, r.timeOut, r.status, r.hours, r.remarks].map(safe).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(safe).join(','), ...lines].join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `attendance-${type}-${report.period}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const input = 'rounded border border-forest-100 px-3 py-2';
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Attendance reports</h1>
      <form onSubmit={load} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-forest-100 bg-white p-4">
        <label className="text-sm font-medium">Report
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${input} block`}><option value="daily">Daily</option><option value="monthly">Monthly</option></select></label>
        {type === 'daily'
          ? <label className="text-sm font-medium">Date<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`${input} block`} /></label>
          : <label className="text-sm font-medium">Month<input type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className={`${input} block`} /></label>}
        <button disabled={loading} className="rounded bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-60">{loading ? 'Loading...' : 'Generate report'}</button>
        {report && <button type="button" onClick={exportCsv} className="rounded border border-forest-800 px-4 py-2 text-sm font-semibold">Download CSV</button>}
      </form>
      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {report?.type === 'monthly' && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-forest-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-forest-100/60"><tr><th className="p-3">Student</th><th className="p-3 text-right">Days</th><th className="p-3 text-right">Present</th><th className="p-3 text-right">Late</th><th className="p-3 text-right">Half day</th><th className="p-3 text-right">Absent</th><th className="p-3 text-right">Hours</th><th className="p-3 text-right">Rate</th></tr></thead>
            <tbody>{report.summary.map((s) => (
              <tr key={s.student} className="border-t border-forest-100"><td className="p-3 font-medium">{s.student}</td><td className="p-3 text-right">{s.days}</td><td className="p-3 text-right">{s.present}</td><td className="p-3 text-right">{s.late}</td><td className="p-3 text-right">{s.halfDay}</td><td className="p-3 text-right">{s.absent}</td><td className="p-3 text-right">{s.hours}</td><td className="p-3 text-right">{s.rate}%</td></tr>))}
            </tbody>
          </table>
        </div>)}
      {report && <AttendanceTable records={report.rows} showStudent />}
    </>
  );
}
