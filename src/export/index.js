import { buildInstitutionPdf, buildStudentPdf, buildTeacherPdf, loadPdfLibs } from './pdf';
import { buildInstitutionXlsx, buildStudentXlsx, buildTeacherXlsx, newWorkbook, saveWorkbook } from './excel';

const PDF = { student: buildStudentPdf, institution: buildInstitutionPdf, teacher: buildTeacherPdf };
const XLSX = { student: buildStudentXlsx, institution: buildInstitutionXlsx, teacher: buildTeacherXlsx };
const slug = (s) => String(s || 'report').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
export const subjectOf = (kind, r) => (kind === 'student' ? r.student.studentId : kind === 'institution' ? r.institution.name : r.teacher.name);

/** kind: student | institution | teacher. format: pdf | excel. */
export async function exportReport(kind, report, format, brand) {
  const name = `wipms-${kind}-${slug(subjectOf(kind, report))}-${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') PDF[kind](await loadPdfLibs(), report, brand).save(`${name}.pdf`);
  else { const wb = await newWorkbook(); XLSX[kind](wb, report); await saveWorkbook(wb, `${name}.xlsx`); }
}
