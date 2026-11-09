import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import { ProgressBar } from '../components/attendanceUi';
import { StatsPanel, num, pct } from '../components/analyticsUi';
import { CompletionTrendChart, MonthlyProgressChart, WeeklyAttendanceChart } from '../components/analyticsCharts';
import { ErrorBanner } from '../components/ui';
import { useStudentAnalytics } from '../hooks/useAnalytics';
import { StudentLeaderBanner } from '../components/LeaderWidgets';
import { StudentConductCard } from '../components/ConductWidgets';

export default function StudentDashboard() {
  const { data: d, error, isLoading } = useStudentAnalytics();
  const c = d?.cards, s = d?.stats;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Student dashboard</h1>
        <div className="flex gap-3">
          <Link to="/student/attendance" className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600">Log attendance</Link>
          <Link to="/student/journals" className="rounded border border-forest-800 px-4 py-2 text-sm font-semibold">Write journal</Link>
        </div>
      </div>
      <StudentLeaderBanner />
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading your progress...</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hours rendered" value={num(c?.hoursRendered)} hint={c && `of ${c.requiredHours} required`} />
        <StatCard label="Attendance percentage" value={pct(c?.attendancePct)} hint="Present, late and half days" />
        <StatCard label="Journal completion" value={pct(c?.journalCompletion)} hint={c && `${c.journalsDone} of ${c.journalsExpected} attended days`} />
        <StatCard label="Remaining hours" value={num(c?.remainingHours)} />
      </div>
      {c && <div className="mt-6 rounded-lg border border-forest-100 bg-white p-5"><ProgressBar pct={c.completionPct} label="Overall completion" /></div>}
      <StudentConductCard />

      {s && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <StatsPanel title="Attendance statistics" items={[
            ['Days attended', s.daysAttended], ['Days late', s.daysLate], ['Days absent', s.daysAbsent], ['Average hours per day', num(s.avgHoursPerDay)],
            ['Estimated time to finish', s.estDaysToFinish === 0 ? 'Completed' : s.estDaysToFinish ? `${s.estDaysToFinish} more days at this pace` : 'Not enough data yet']]} />
          <StatsPanel title="Journal statistics" items={[
            ['Submitted', s.journalsTotal], ['Approved', s.journalsApproved], ['Pending review', s.journalsPending], ['Needs revision', s.journalsRevision]]} />
        </div>)}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <WeeklyAttendanceChart data={d?.charts.weeklyAttendance} /><MonthlyProgressChart data={d?.charts.monthlyProgress} />
      </div>
      <div className="mt-4"><CompletionTrendChart data={d?.charts.completionTrend} /></div>
    </>
  );
}
