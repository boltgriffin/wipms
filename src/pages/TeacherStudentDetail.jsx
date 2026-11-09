import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { AttendanceTable, ProgressBar } from '../components/attendanceUi';
import { useAttendanceStore } from '../store/attendanceStore';

export default function TeacherStudentDetail() {
  const { id } = useParams();
  const { detail, loadDetail, setHours, error } = useAttendanceStore();
  const [msg, setMsg] = useState(null);
  useEffect(() => { loadDetail(id); }, [id, loadDetail]);
  const s = detail?.summary;
  const change = async (e) => {
    setMsg(null);
    try { await setHours(id, Number(e.target.value)); setMsg('Required hours updated.'); } catch (err) { setMsg(err.message); }
  };
  return (
    <>
      <Link to="/teacher/attendance" className="text-sm font-semibold text-amber-600 underline">Back to students</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{detail?.name || 'Student'}</h1>
      {(error || msg) && <p role="alert" className="mb-4 rounded bg-forest-100 p-3 text-sm">{error || msg}</p>}
      {s && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Hours completed" value={s.totalHours} /><StatCard label="Remaining hours" value={s.remainingHours} />
          <StatCard label="Attendance rate" value={`${s.attendanceRate}%`} /><StatCard label="Days logged" value={s.daysLogged} />
        </div>
        <div className="mt-6 grid gap-4 rounded-lg border border-forest-100 bg-white p-5 sm:grid-cols-2">
          <ProgressBar pct={s.completionPct} label="Completion" />
          <label className="text-sm font-medium">Required hours
            <select value={s.requiredHours} onChange={change} className="mt-1 w-full rounded border border-forest-100 px-3 py-2">
              {detail.requiredHoursOptions.map((h) => <option key={h} value={h}>{h} hours</option>)}
            </select></label>
        </div>
        <h2 className="mb-3 mt-8 text-lg font-bold">Attendance records</h2>
        <AttendanceTable records={detail.records} />
      </>}
    </>
  );
}
