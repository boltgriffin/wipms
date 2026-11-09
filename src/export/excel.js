// Excel export (exceljs, loaded only when someone exports). Text is written as plain strings, so a value such as "=1+1" stays text.
const FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12312B' } };
const d10 = (iso) => (iso ? String(iso).slice(0, 10) : '');
const nv = (v) => (v == null ? '' : v);

export async function newWorkbook() {
  const mod = await import('exceljs');
  const wb = new (mod.default || mod).Workbook();
  wb.creator = 'WIPMS'; wb.created = new Date();
  return wb;
}
export async function saveWorkbook(wb, name) {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function kvSheet(wb, name, title, groups) { // groups: [[heading, [[label, value], ...]], ...]
  const ws = wb.addWorksheet(name); ws.columns = [{ width: 40 }, { width: 70 }];
  ws.addRow([title]).font = { bold: true, size: 14 }; ws.addRow([]);
  groups.forEach(([h, rows]) => { ws.addRow([h]).font = { bold: true, color: { argb: 'FF12312B' } }; rows.forEach((r) => ws.addRow([r[0], nv(r[1])])); ws.addRow([]); });
  return ws;
}
function tableSheet(wb, name, head, rows, widths) {
  const ws = wb.addWorksheet(name); ws.columns = head.map((h, i) => ({ width: (widths && widths[i]) || 16 }));
  const h = ws.addRow(head); h.font = { bold: true, color: { argb: 'FFFFFFFF' } }; h.fill = FILL;
  rows.forEach((r) => ws.addRow(r.map(nv)));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}
const studentRows = (rows) => rows.map((s) => [s.name, s.studentId, s.className, s.institutionName, s.teacherName, s.hours.rendered, s.hours.required, s.hours.pct, s.attendanceRate, s.journalCoverage, s.rating, s.conduct, s.status]);
const STUDENT_HEAD = ['Student', 'Student ID', 'Class', 'Institution', 'Teacher', 'Hours rendered', 'Hours required', 'Hours %', 'Attendance %', 'Journal approval %', 'Final rating', 'Conduct score', 'Status'];
const STUDENT_W = [26, 14, 18, 26, 22, 14, 14, 10, 13, 16, 12, 13, 12];

export function buildStudentXlsx(wb, r) {
  const s = r.student, i = r.institution;
  kvSheet(wb, 'Summary', `Student Completion Report - ${s.name}`, [
    ['Completion status', [['Status', r.status], ...r.criteria.map((c) => [c.label, `${c.met ? 'Met' : 'Not met'} - ${c.detail}`])]],
    ['Personal details', [['Name', s.name], ['Student ID', s.studentId], ['LRN', s.lrn], ['Sex', s.sex], ['Grade', s.gradeLevel], ['Strand', s.strand], ['Section', s.section], ['Contact number', s.contactNumber],
      ['Parent / guardian', s.parentName], ['Parent contact', s.parentContact], ['Assigned teacher', s.teacherName], ['Deployed on', d10(s.deployedAt)]]],
    ['Institution', i ? [['Name', i.name], ['Industry', i.industry], ['Contact person', i.contactPerson], ['Contact number', i.contactNumber], ['Email', i.email], ['Address', i.address]] : [['Institution', 'Not assigned']]],
    ['Hours completed', [['Hours rendered', r.hours.rendered], ['Required hours', r.hours.required], ['Remaining', r.hours.remaining], ['Completion %', r.hours.pct]]],
    ['Attendance summary', [['Days logged', r.attendance.daysLogged], ['Present', r.attendance.counts.Present], ['Late', r.attendance.counts.Late], ['Half day', r.attendance.counts['Half Day']], ['Absent', r.attendance.counts.Absent],
      ['Attendance rate %', r.attendance.rate], ['Verified by supervisor', r.attendance.verified], ['Disputed', r.attendance.disputed], ['First day', r.attendance.firstDate], ['Last day', r.attendance.lastDate]]],
    ['Journal summary', [['Submitted', r.journals.total], ['Approved', r.journals.approved], ['Pending', r.journals.pending], ['Revision required', r.journals.revision], ['Rejected', r.journals.rejected],
      ['Attended days', r.journals.attendedDays], ['Attended days with approved journal', r.journals.approvedDays], ['Journal approval %', r.journals.coveragePct]]],
    ['Conduct and final rating', [['Merit points', r.conduct.merits], ['Infraction points', r.conduct.infractions], ['Conduct score (100 + merits - infractions)', r.conduct.score],
      ['Final rating (1-5)', r.finalRating.average], ['Rating', r.finalRating.label], ['Rating based on', r.finalRating.basis],
      ['Teacher approval', r.approval ? `${r.approval.by}, ${d10(r.approval.at)}` : 'Not approved yet']]]
  ]);
  tableSheet(wb, 'Evaluations', ['Date', 'Type', 'Supervisor', 'Professionalism', 'Attendance', 'Punctuality', 'Communication', 'Work Ethics', 'Technical Skills', 'Average', 'Rating', 'Comments'],
    r.evaluations.map((e) => [d10(e.date), e.type, e.supervisorName, e.scores.professionalism, e.scores.attendance, e.scores.punctuality, e.scores.communication, e.scores.workEthics, e.scores.technicalSkills, e.average, e.rating, e.comments]),
    [12, 10, 22, 15, 12, 12, 14, 12, 15, 10, 18, 60]);
  tableSheet(wb, 'Merits', ['Date', 'Category', 'Points', 'Reason', 'Reviewed by'], r.merits.map((m) => [d10(m.date), m.typeName, m.points, m.description, m.reviewedBy]), [12, 24, 8, 70, 22]);
  tableSheet(wb, 'Infractions', ['Date', 'Category', 'Infraction', 'Points', 'Details', 'Reviewed by'], r.infractions.map((m) => [d10(m.date), m.category, m.typeName, m.points, m.description, m.reviewedBy]), [12, 14, 24, 8, 70, 22]);
}
export function buildInstitutionXlsx(wb, r) {
  const i = r.institution, s = r.summary;
  kvSheet(wb, 'Summary', `Institution Summary Report - ${i.name}`, [
    ['Institution details', [['Name', i.name], ['Industry', i.industry], ['Contact person', i.contactPerson], ['Contact number', i.contactNumber], ['Email', i.email], ['Address', i.address], ['Available slots', i.availableSlots]]],
    ['Summary', [['Scope', r.scopeNote], ['Assigned students', s.students], ['Completed', s.statusCounts.Completed], ['Pending', s.statusCounts.Pending], ['Incomplete', s.statusCounts.Incomplete], ['Completion rate %', s.completionRate],
      ['Average hours completed %', s.avgHoursPct], ['Average attendance %', s.avgAttendance], ['Average final rating', s.avgRating], ['Average conduct score', s.avgConduct]]]
  ]);
  tableSheet(wb, 'Top students', ['Rank', ...STUDENT_HEAD], r.top.map((t) => [t.rank, ...studentRows([t])[0]]), [7, ...STUDENT_W]);
  tableSheet(wb, 'Students', STUDENT_HEAD, studentRows(r.students), STUDENT_W);
}
export function buildTeacherXlsx(wb, r) {
  const s = r.summary;
  kvSheet(wb, 'Summary', `Teacher Summary Report - ${r.teacher.name}`, [
    ['Students', [['Active students', s.activeStudents], ['Completed students', s.completedStudents], ['Students in report', s.students], ['Pending', s.statusCounts.Pending], ['Incomplete', s.statusCounts.Incomplete]]],
    ['Statistics', [['Completion rate %', s.completionRate], ['Average hours completed %', s.avgHoursPct], ['Average attendance %', s.avgAttendance], ['Average journal approval %', s.avgJournalCoverage],
      ['Average final rating', s.avgRating], ['Average conduct score', s.avgConduct], ['Total hours rendered', s.totalHours], ['Merit points', s.meritPoints], ['Infraction points', s.infractionPoints]]]
  ]);
  tableSheet(wb, 'By institution', ['Institution', 'Students', 'Completed', 'Completion rate %', 'Average hours %'], r.byInstitution.map((x) => [x.institutionName, x.students, x.completed, x.completionRate, x.avgHoursPct]), [30, 10, 11, 17, 16]);
  tableSheet(wb, 'Students', STUDENT_HEAD, studentRows(r.students), STUDENT_W);
}
