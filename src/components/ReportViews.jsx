import { useState } from 'react';
import { CompletionPill, CriteriaList, d10, nz, pct } from './CompletionUi';
import { ErrorBanner, Modal, btnGhost, btnPrimary } from './ui';
import { exportReport, subjectOf } from '../export';
import { useCompletionAction, useReport } from '../hooks/useCompletion';
import { useBranding } from '../hooks/useShell';

const Sec = ({ title, children }) => <section className="mt-6"><h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-forest-700">{title}</h3>{children}</section>;
const KV = ({ rows }) => <dl className="divide-y divide-forest-100 rounded-lg border border-forest-100 bg-white">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 p-2.5 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{nz(v)}</dd></div>)}</dl>;
const Table = ({ head, rows, empty = 'None' }) => (
  <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
    <thead className="bg-forest-100/60"><tr>{head.map((h) => <th key={h} className="p-2.5">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-forest-100">{r.map((c, j) => <td key={j} className="p-2.5">{nz(c)}</td>)}</tr>)}
      {!rows.length && <tr><td className="p-4 text-center text-forest-700" colSpan={head.length}>{empty}</td></tr>}</tbody></table></div>
);
const pts = (v) => (v > 0 ? `+${v}` : v);
const rowCells = (s) => [s.name, s.className, s.institutionName, `${s.hours.rendered}/${s.hours.required}`, pct(s.attendanceRate), pct(s.journalCoverage), s.rating, s.conduct, <CompletionPill key="s" status={s.status} />];
const HEAD = ['Student', 'Class', 'Institution', 'Hours', 'Attendance', 'Journals', 'Rating', 'Conduct', 'Status'];

export function ExportButtons({ kind, report }) {
  const log = useCompletionAction('/reports/log');
  const { branding } = useBranding(); // the school logo and name head every exported PDF
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const run = async (format) => {
    setBusy(format); setErr('');
    try { await exportReport(kind, report, format, branding); log.mutate({ report: kind, format, subject: subjectOf(kind, report) }); } catch (e) { setErr(`Export failed: ${e.message}`); }
    setBusy('');
  };
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button className={btnPrimary} disabled={!!busy} onClick={() => run('pdf')}>{busy === 'pdf' ? 'Building PDF...' : 'Export PDF'}</button>
        <button className={btnGhost} disabled={!!busy} onClick={() => run('excel')}>{busy === 'excel' ? 'Building Excel...' : 'Export Excel'}</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

export function StudentReportView({ r }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">{r.student.name}</h2><p className="text-sm text-forest-700">{r.student.studentId} - Generated {d10(r.generatedAt)}</p></div><CompletionPill status={r.status} /></div>
      <Sec title="Completion criteria"><CriteriaList criteria={r.criteria} /></Sec>
      <Sec title="Personal details"><KV rows={[['LRN', r.student.lrn], ['Sex', r.student.sex], ['Grade / strand / section', `${r.student.gradeLevel} ${r.student.strand} - ${r.student.section}`], ['Contact number', r.student.contactNumber],
        ['Parent / guardian', `${r.student.parentName} (${r.student.parentContact})`], ['Assigned teacher', r.student.teacherName], ['Institution', r.institution?.name || 'Not assigned'], ['Deployed on', d10(r.student.deployedAt)]]} /></Sec>
      <Sec title="Hours completed"><KV rows={[['Rendered', r.hours.rendered], ['Required', r.hours.required], ['Remaining', r.hours.remaining], ['Completion', pct(r.hours.pct)]]} /></Sec>
      <Sec title="Attendance summary"><KV rows={[['Days logged', r.attendance.daysLogged], ['Present / late / half day / absent', `${r.attendance.counts.Present} / ${r.attendance.counts.Late} / ${r.attendance.counts['Half Day']} / ${r.attendance.counts.Absent}`],
        ['Attendance rate', pct(r.attendance.rate)], ['Verified by supervisor / disputed', `${r.attendance.verified} / ${r.attendance.disputed}`]]} /></Sec>
      <Sec title="Journal summary"><KV rows={[['Submitted', r.journals.total], ['Approved / pending / revision / rejected', `${r.journals.approved} / ${r.journals.pending} / ${r.journals.revision} / ${r.journals.rejected}`],
        ['Attended days with an approved journal', `${r.journals.approvedDays} of ${r.journals.attendedDays} (${pct(r.journals.coveragePct)})`]]} /></Sec>
      <Sec title="Supervisor evaluations"><Table head={['Date', 'Type', 'Supervisor', 'Average', 'Rating', 'Comments']} rows={r.evaluations.map((e) => [e.date, e.type, e.supervisorName, e.average, e.rating, e.comments])} empty="No submitted evaluations." /></Sec>
      <Sec title="Merits"><Table head={['Date', 'Category', 'Points', 'Reason']} rows={r.merits.map((m) => [m.date, m.typeName, pts(m.points), m.description])} /></Sec>
      <Sec title="Infractions"><Table head={['Date', 'Category', 'Infraction', 'Points', 'Details']} rows={r.infractions.map((m) => [m.date, m.category, m.typeName, pts(m.points), m.description])} /></Sec>
      <Sec title="Final rating"><KV rows={[['Conduct score', `100 + ${r.conduct.merits} - ${r.conduct.infractions} = ${r.conduct.score}`], ['Final rating', r.finalRating.average == null ? 'Not rated yet' : `${r.finalRating.average} / 5 - ${r.finalRating.label}`], ['Based on', r.finalRating.basis],
        ['Teacher approval', r.approval ? `${r.approval.by}, ${d10(r.approval.at)}` : 'Not approved yet']]} /></Sec>
    </div>
  );
}

export function InstitutionReportView({ r }) {
  const s = r.summary, i = r.institution;
  return (
    <div>
      <h2 className="text-xl font-bold">{i.name}</h2><p className="text-sm text-forest-700">{r.scopeNote} Generated {d10(r.generatedAt)}.</p>
      <Sec title="Institution details"><KV rows={[['Industry', i.industry], ['Contact person', `${i.contactPerson} (${i.contactNumber})`], ['Email', i.email], ['Address', i.address], ['Available slots', i.availableSlots]]} /></Sec>
      <Sec title="Summary"><KV rows={[['Assigned students', s.students], ['Completed / pending / incomplete', `${s.statusCounts.Completed} / ${s.statusCounts.Pending} / ${s.statusCounts.Incomplete}`], ['Completion rate', pct(s.completionRate)],
        ['Average hours completed', pct(s.avgHoursPct)], ['Average attendance', pct(s.avgAttendance)], ['Average final rating', s.avgRating], ['Average conduct score', s.avgConduct]]} /></Sec>
      <Sec title="Top students"><p className="mb-2 text-xs text-forest-700">Ranked by final rating, then conduct score, attendance and hours completed.</p><Table head={['#', ...HEAD]} rows={r.top.map((t) => [t.rank, ...rowCells(t)])} empty="No student has rendered hours yet." /></Sec>
      <Sec title="Assigned students"><Table head={HEAD} rows={r.students.map(rowCells)} empty="No students." /></Sec>
    </div>
  );
}

export function TeacherReportView({ r }) {
  const s = r.summary;
  return (
    <div>
      <h2 className="text-xl font-bold">{r.teacher.name}</h2><p className="text-sm text-forest-700">Generated {d10(r.generatedAt)}</p>
      <Sec title="Students"><KV rows={[['Active students', s.activeStudents], ['Completed students', s.completedStudents], ['Pending / incomplete', `${s.statusCounts.Pending} / ${s.statusCounts.Incomplete}`]]} /></Sec>
      <Sec title="Statistics"><KV rows={[['Completion rate', pct(s.completionRate)], ['Average hours completed', pct(s.avgHoursPct)], ['Average attendance', pct(s.avgAttendance)], ['Average journal approval', pct(s.avgJournalCoverage)],
        ['Average final rating', s.avgRating], ['Average conduct score', s.avgConduct], ['Total hours rendered', s.totalHours], ['Merit / infraction points', `+${s.meritPoints} / -${s.infractionPoints}`]]} /></Sec>
      <Sec title="By institution"><Table head={['Institution', 'Students', 'Completed', 'Completion rate', 'Average hours']} rows={r.byInstitution.map((x) => [x.institutionName, x.students, x.completed, pct(x.completionRate), pct(x.avgHoursPct)])} /></Sec>
      <Sec title="Students"><Table head={HEAD} rows={r.students.map(rowCells)} empty="No students." /></Sec>
    </div>
  );
}

// A student's full report in a dialog, with export buttons. Used by teachers and by students for their own report.
export function StudentReportModal({ studentId, onClose }) {
  const q = useReport('student', { studentId });
  return (
    <Modal title="Student completion report" onClose={onClose} wide>
      {q.isLoading && <p className="text-sm">Building the report...</p>}<ErrorBanner error={q.error} />
      {q.data && <><div className="mb-4"><ExportButtons kind="student" report={q.data.report} /></div><StudentReportView r={q.data.report} /></>}
    </Modal>
  );
}
