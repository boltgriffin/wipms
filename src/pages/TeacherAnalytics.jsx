import { useEffect } from 'react';
import { HoursBar, RateBar, StatusPie } from '../components/charts';
import { useAttendanceStore } from '../store/attendanceStore';

export default function TeacherAnalytics() {
  const { analytics: a, loadAnalytics, error } = useAttendanceStore();
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Attendance analytics</h1>
      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2"><StatusPie counts={a?.statusCounts} /><HoursBar data={a?.hoursByDate} title="Hours rendered per day (last 14 days logged)" /></div>
      <div className="mt-4"><RateBar students={a?.students} /></div>
    </>
  );
}
