// PDF export. The libraries are loaded only when someone exports, so they do not slow down the rest of the app.
const BRAND = [18, 49, 43], MUTED = [90, 110, 105];
const d10 = (iso) => (iso ? String(iso).slice(0, 10) : '-');
const pc = (v) => (v == null ? '-' : `${v}%`);
const nv = (v) => (v == null || v === '' ? '-' : String(v));
const pts = (v) => (v > 0 ? `+${v}` : String(v));

export async function loadPdfLibs() {
  const [{ jsPDF }, mod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable: mod.default || mod.autoTable };
}

function Doc({ jsPDF, autoTable }, title, subtitle, generated, brand) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const b = brand || {};
  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 72, 'F');
  let left = 40;
  [b.schoolLogo, b.divisionLogo].filter(Boolean).forEach((logo) => { // the school's own logo heads every report
    try { doc.addImage(`data:${logo.mimeType};base64,${logo.data}`, logo.mimeType === 'image/png' ? 'PNG' : 'JPEG', left, 14, 44, 44); left += 52; } catch (e) { /* skip an image jsPDF cannot read */ }
  });
  doc.setTextColor(255); doc.setFontSize(10);
  doc.text(`${b.schoolName || 'WIPMS'}${b.divisionName ? ` - ${b.divisionName}` : ''}`, left, 26);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(title, left, 50);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(b.systemName || 'Work Immersion Progress Monitoring System', left, 64);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
  let y = 96;
  doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(subtitle, 40, y); y += 15; doc.text(generated, 40, y); y += 20; doc.setTextColor(0);
  const need = (h) => { if (y + h > H - 60) { doc.addPage(); y = 50; } };
  const after = () => { y = doc.lastAutoTable.finalY + 16; };
  const api = {
    doc,
    heading(t) { need(70); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND); doc.text(t, 40, y); doc.setFont('helvetica', 'normal'); doc.setTextColor(0); y += 4; },
    kv(rows) { autoTable(doc, { startY: y + 4, body: rows, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 150, textColor: MUTED } }, margin: { left: 40, right: 40 } }); after(); },
    table(head, body, opts = {}) {
      if (!body.length) { doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text('None', 40, y + 16); doc.setTextColor(0); y += 30; return; }
      autoTable(doc, { startY: y + 4, head: [head], body, theme: 'grid', styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' }, headStyles: { fillColor: BRAND }, margin: { left: 40, right: 40 }, ...opts }); after();
    },
    finish() { // page footers
      const n = doc.getNumberOfPages();
      for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(`${(brand && brand.schoolName) || 'WIPMS'} - confidential: contains student records. Share only with authorized school staff.`, 40, H - 28); doc.text(`Page ${i} of ${n}`, W - 40, H - 28, { align: 'right' }); }
      return doc;
    },
    save(name) { api.finish().save(name); }
  };
  return api;
}
const stamp = (r) => `Generated ${d10(r.generatedAt)} by ${r.generatedBy || 'system'}`;
const classRows = (rows) => rows.map((s) => [s.name, s.className, nv(s.institutionName), `${s.hours.rendered}/${s.hours.required}`, pc(s.attendanceRate), pc(s.journalCoverage), nv(s.rating), s.conduct, s.status]);
const CLASS_HEAD = ['Student', 'Class', 'Institution', 'Hours', 'Attendance', 'Journals', 'Rating', 'Conduct', 'Status'];

export function buildStudentPdf(libs, r, brand) {
  const d = Doc(libs, 'Student Completion Report', `${r.student.name} (${r.student.studentId})`, stamp(r), brand);
  d.heading('Completion status');
  d.kv([['Status', r.status], ...r.criteria.map((c) => [c.label, `${c.met ? 'Met' : 'Not met'} - ${c.detail}`])]);
  d.heading('Personal details');
  d.kv([['Name', r.student.name], ['Student ID', r.student.studentId], ['LRN', r.student.lrn], ['Sex', r.student.sex], ['Grade / strand / section', `${r.student.gradeLevel} ${r.student.strand} - ${r.student.section}`],
    ['Contact number', nv(r.student.contactNumber)], ['Parent / guardian', `${nv(r.student.parentName)} (${nv(r.student.parentContact)})`], ['Assigned teacher', nv(r.student.teacherName)], ['Deployed on', d10(r.student.deployedAt)]]);
  d.heading('Institution');
  d.kv(r.institution ? [['Name', r.institution.name], ['Industry', r.institution.industry], ['Contact person', `${r.institution.contactPerson} (${r.institution.contactNumber})`], ['Email', r.institution.email], ['Address', r.institution.address]] : [['Institution', 'Not assigned']]);
  d.heading('Hours completed');
  d.kv([['Hours rendered', r.hours.rendered], ['Required hours', r.hours.required], ['Remaining', r.hours.remaining], ['Completion', pc(r.hours.pct)]]);
  d.heading('Attendance summary');
  d.kv([['Days logged', r.attendance.daysLogged], ['Present / Late / Half day / Absent', `${r.attendance.counts.Present} / ${r.attendance.counts.Late} / ${r.attendance.counts['Half Day']} / ${r.attendance.counts.Absent}`],
    ['Attendance rate', pc(r.attendance.rate)], ['Verified by supervisor / disputed', `${r.attendance.verified} / ${r.attendance.disputed}`], ['Period', `${d10(r.attendance.firstDate)} to ${d10(r.attendance.lastDate)}`]]);
  d.heading('Journal summary');
  d.kv([['Journals submitted', r.journals.total], ['Approved / pending / revision / rejected', `${r.journals.approved} / ${r.journals.pending} / ${r.journals.revision} / ${r.journals.rejected}`],
    ['Attended days with an approved journal', `${r.journals.approvedDays} of ${r.journals.attendedDays} (${pc(r.journals.coveragePct)})`]]);
  d.heading('Supervisor evaluations');
  d.table(['Date', 'Type', 'Supervisor', 'Prof.', 'Attend.', 'Punct.', 'Comm.', 'Work eth.', 'Tech.', 'Avg', 'Rating'],
    r.evaluations.map((e) => [d10(e.date), e.type, e.supervisorName, e.scores.professionalism, e.scores.attendance, e.scores.punctuality, e.scores.communication, e.scores.workEthics, e.scores.technicalSkills, nv(e.average), e.rating]));
  if (r.evaluations.length) d.table(['Evaluation', 'Supervisor comments'], r.evaluations.map((e) => [`${e.type} ${d10(e.date)}`, nv(e.comments)]), { columnStyles: { 0: { cellWidth: 110 } } });
  d.heading('Merits');
  d.table(['Date', 'Category', 'Points', 'Reason'], r.merits.map((m) => [d10(m.date), m.typeName, pts(m.points), m.description]));
  d.heading('Infractions');
  d.table(['Date', 'Category', 'Infraction', 'Points', 'Details'], r.infractions.map((m) => [d10(m.date), m.category, m.typeName, pts(m.points), m.description]));
  d.heading('Conduct score and final rating');
  d.kv([['Conduct score', `100 + ${r.conduct.merits} merits - ${r.conduct.infractions} infractions = ${r.conduct.score}`],
    ['Final rating', r.finalRating.average == null ? 'Not rated yet' : `${r.finalRating.average} / 5 - ${r.finalRating.label}`], ['Rating based on', nv(r.finalRating.basis)],
    ['Teacher approval', r.approval ? `${r.approval.by}, ${d10(r.approval.at)}${r.approval.remarks ? ` - ${r.approval.remarks}` : ''}` : 'Not approved yet']]);
  return d;
}

export function buildInstitutionPdf(libs, r, brand) {
  const s = r.summary, i = r.institution;
  const d = Doc(libs, 'Institution Summary Report', i.name, `${stamp(r)}. ${r.scopeNote}`, brand);
  d.heading('Institution details');
  d.kv([['Name', i.name], ['Industry', i.industry], ['Contact person', `${i.contactPerson} (${i.contactNumber})`], ['Email', i.email], ['Address', i.address], ['Available slots', i.availableSlots]]);
  d.heading('Summary');
  d.kv([['Assigned students', s.students], ['Completed / pending / incomplete', `${s.statusCounts.Completed} / ${s.statusCounts.Pending} / ${s.statusCounts.Incomplete}`], ['Completion rate', pc(s.completionRate)],
    ['Average hours completed', pc(s.avgHoursPct)], ['Average attendance', pc(s.avgAttendance)], ['Average final rating', nv(s.avgRating)], ['Average conduct score', nv(s.avgConduct)]]);
  d.heading('Top students');
  d.table(['#', 'Student', 'Class', 'Rating', 'Conduct', 'Attendance', 'Hours', 'Status'], r.top.map((t) => [t.rank, t.name, t.className, nv(t.rating), t.conduct, pc(t.attendanceRate), `${t.hours.rendered}/${t.hours.required}`, t.status]));
  d.heading('All assigned students');
  d.table(CLASS_HEAD, classRows(r.students));
  return d;
}

export function buildTeacherPdf(libs, r, brand) {
  const s = r.summary;
  const d = Doc(libs, 'Teacher Summary Report', r.teacher.name, stamp(r), brand);
  d.heading('Students');
  d.kv([['Active students', s.activeStudents], ['Completed students', s.completedStudents], ['Total students in report', s.students], ['Pending / incomplete', `${s.statusCounts.Pending} / ${s.statusCounts.Incomplete}`]]);
  d.heading('Statistics');
  d.kv([['Completion rate', pc(s.completionRate)], ['Average hours completed', pc(s.avgHoursPct)], ['Average attendance', pc(s.avgAttendance)], ['Average journal approval', pc(s.avgJournalCoverage)],
    ['Average final rating', nv(s.avgRating)], ['Average conduct score', nv(s.avgConduct)], ['Total hours rendered', s.totalHours], ['Merit / infraction points', `+${s.meritPoints} / -${s.infractionPoints}`]]);
  d.heading('By institution');
  d.table(['Institution', 'Students', 'Completed', 'Completion rate', 'Avg hours'], r.byInstitution.map((x) => [x.institutionName, x.students, x.completed, pc(x.completionRate), pc(x.avgHoursPct)]));
  d.heading('Students');
  d.table(CLASS_HEAD, classRows(r.students));
  return d;
}
