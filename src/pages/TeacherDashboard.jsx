import StatCard from '../components/StatCard';
import { TeacherJournalPanel } from '../components/JournalWidgets';
import { StatsPanel, num, pct } from '../components/analyticsUi';
import { CompletionTrendChart, MonthlyProgressChart, WeeklyAttendanceChart } from '../components/analyticsCharts';
import { ErrorBanner } from '../components/ui';
import { useTeacherAnalytics } from '../hooks/useAnalytics';
import { TeacherLeaderPanel } from '../components/LeaderWidgets';
import { TeacherConductPanel } from '../components/ConductWidgets';

export default function TeacherDashboard() {
  const { data: d, error, isLoading } = useTeacherAnalytics();
  const c = d?.cards, n = d?.notes, s = d?.stats;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Teacher dashboard</h1>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading progress...</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total students" value={num(c?.totalStudents)} />
        <StatCard label="Deployed students" value={num(c?.deployedStudents)} hint="Active with an institution" />
        <StatCard label="Completion rate" value={pct(c?.completionRate)} hint={n && `${n.studentsCompleted} of ${n.trackedStudents} finished required hours`} />
        <StatCard label="Attendance rate" value={pct(c?.attendanceRate)} />
        <StatCard label="Journal compliance" value={pct(c?.journalCompliance)} hint="Attended days with a journal" />
      </div>
      {n?.deployedWithoutAccount > 0 && (
        <p className="mt-4 rounded bg-amber-50 p-3 text-sm">{n.deployedWithoutAccount} deployed student(s) have no login account yet, so their attendance and journals are not counted. Add a login email in Student management.</p>)}

      <TeacherJournalPanel />
      <TeacherLeaderPanel />
      <TeacherConductPanel />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {s && <StatsPanel title="Summary statistics" items={[
          ['Hours rendered (all students)', s.totalHours], ['Hours required (all students)', s.totalRequired], ['Average hours per student', num(s.avgHoursPerStudent)],
          ['Students who finished', s.studentsCompleted], ['Students with no hours yet', s.studentsNotStarted],
          ['Journals approved', s.journalsApproved], ['Journals pending review', s.journalsPending]]} />}
        <WeeklyAttendanceChart data={d?.charts.weeklyAttendance} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MonthlyProgressChart data={d?.charts.monthlyProgress} /><CompletionTrendChart data={d?.charts.completionTrend} />
      </div>

      {!!d?.students.length && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">Student progress <span className="text-sm font-normal text-forest-700">(lowest completion first)</span></h2>
          <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-forest-100/60"><tr><th className="p-3">Student</th><th className="p-3 text-right">Hours</th><th className="p-3 min-w-40">Completion</th><th className="p-3 text-right">Attendance</th><th className="p-3 text-right">Journals</th></tr></thead>
              <tbody>{d.students.map((x) => (
                <tr key={x.id} className="border-t border-forest-100">
                  <td className="p-3 font-medium">{x.name}</td><td className="p-3 text-right">{x.hours} / {x.requiredHours}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded bg-forest-100"><div className="h-full bg-amber-500" style={{ width: `${x.completionPct}%` }} /></div><span className="w-12 text-right">{x.completionPct}%</span></div></td>
                  <td className="p-3 text-right">{pct(x.attendanceRate)}</td><td className="p-3 text-right">{pct(x.journalCompliance)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </section>)}
    </>
  );
}
