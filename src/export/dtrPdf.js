// Daily Time Record export. jsPDF is imported only when someone downloads, as with the other reports.
import { loadPdfLibs } from './pdf';
import { drawAppLogo } from './logo';

const BRAND = [18, 49, 43], MUTED = [90, 110, 105];
const SOURCE_LABEL = { GPS_VERIFIED: 'GPS', NON_GPS_VERIFIED: 'No GPS', OFFLINE_SYNC: 'Offline', LEADER_RECORDED: 'Leader' };
const dash = (v) => (v === null || v === undefined || v === '' ? '-' : String(v));
const d10 = (iso) => (iso ? String(iso).slice(0, 10) : '-');

/**
 * A draft is stamped across every page. The stamp is drawn under the content so it never hides a time,
 * and it is the only visual difference between what a student downloads and what a teacher releases.
 */
function draftStamp(doc, W, H) {
  doc.saveGraphicsState();
  if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.08 }));
  doc.setTextColor(...BRAND); doc.setFontSize(96); doc.setFont('helvetica', 'bold');
  doc.text('DRAFT', W / 2, H / 2, { align: 'center', angle: 32 });
  doc.restoreGraphicsState();
  doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
}

export function buildDtrPdf({ jsPDF, autoTable }, dtr, brand) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const b = brand || {}, t = dtr.totals || {}, official = !!dtr.official;

  doc.setFillColor(...BRAND); doc.rect(0, 0, W, 72, 'F');
  let left = 40;
  // The school's own seals first, then the system mark, so the school leads on its own paperwork.
  [b.schoolLogo, b.divisionLogo].filter(Boolean).forEach((logo) => {
    try { doc.addImage(`data:${logo.mimeType};base64,${logo.data}`, logo.mimeType === 'image/png' ? 'PNG' : 'JPEG', left, 14, 44, 44); left += 52; } catch (e) { /* skip an image jsPDF cannot read */ }
  });
  if (left === 40) { drawAppLogo(doc, left, 16, 40); left += 50; }
  doc.setTextColor(255); doc.setFontSize(10);
  doc.text(`${b.schoolName || 'WIPMS'}${b.divisionName ? ` - ${b.divisionName}` : ''}`, left, 26);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(official ? 'Daily Time Record' : 'Daily Time Record (Draft)', left, 50);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(b.systemName || 'Work Immersion Progress Monitoring System', left, 64);
  doc.setTextColor(0);

  const s = dtr.student || {};
  autoTable(doc, {
    startY: 92, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 110, textColor: MUTED }, 2: { fontStyle: 'bold', cellWidth: 110, textColor: MUTED } },
    body: [
      ['Student', dash(s.name), 'Institution', dash(s.institution)],
      ['Period', `${d10(t.periodStart)} to ${d10(t.periodEnd)}`, 'Lunch break', dtr.lunch ? dtr.lunch.label : '12:00 PM to 1:00 PM'],
      ['Hours rendered', `${t.totalHours ?? 0} of ${t.requiredHours ?? 0} (${t.completionPct ?? 0}%)`, 'Days rendered', String(t.daysWorked ?? t.daysCount ?? 0)],
      ['Status', official ? `Approved${dtr.approvedBy ? ` by ${dtr.approvedBy}` : ''} on ${d10(dtr.approvedAt)}` : 'Draft - not yet approved by the teacher',
        'Revision', String(dtr.revision || 1)]
    ],
    margin: { left: 40, right: 40 }
  });

  const body = (dtr.days || []).map((d) => [d.date, dash(d.amIn), dash(d.amOut), dash(d.pmIn), dash(d.pmOut),
    d.state === 'IN_PROGRESS' ? '-' : String(d.hours), d.state === 'IN_PROGRESS' ? 'No time out' : d.status, SOURCE_LABEL[d.source] || '-']);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 14,
    head: [['Date', 'AM in', 'AM out', 'PM in', 'PM out', 'Hours', 'Status', 'Source']],
    body: body.length ? body : [['-', '-', '-', '-', '-', '-', 'No attendance recorded', '-']],
    foot: [['Total', '', '', '', '', String(t.totalHours ?? 0), '', '']],
    theme: 'grid', styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: BRAND }, footStyles: { fillColor: [240, 244, 243], textColor: 20, fontStyle: 'bold' },
    columnStyles: { 5: { halign: 'right' } }, margin: { left: 40, right: 40 }
  });

  let y = doc.lastAutoTable.finalY + 26;
  if (y > H - 150) { doc.addPage(); y = 60; }
  doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  doc.text('I certify that the above is a true record of the hours rendered.', 40, y);
  y += 46;
  doc.setDrawColor(150); doc.setTextColor(0); doc.setFontSize(9);
  doc.line(40, y, 230, y); doc.line(W - 230, y, W - 40, y);
  doc.text(dash(s.name), 40, y + 13);
  doc.text(official && dtr.approvedBy ? dtr.approvedBy : '', W - 230, y + 13);
  doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text('Student', 40, y + 25);
  doc.text(official ? 'Work immersion teacher' : 'Work immersion teacher (not yet signed)', W - 230, y + 25);

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    if (!official) draftStamp(doc, W, H);
    doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(official
      ? `${b.schoolName || 'WIPMS'} - official daily time record. Generated ${d10(dtr.generatedAt)}.`
      : `${b.schoolName || 'WIPMS'} - draft only. Not valid until approved by the work immersion teacher.`, 40, H - 28);
    doc.text(`Page ${i} of ${n}`, W - 40, H - 28, { align: 'right' });
  }
  return doc;
}

const slug = (x) => String(x || 'dtr').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'dtr';

/** Downloads the DTR. The file name says whether it is a draft, so the two never get mixed up. */
export async function exportDtr(dtr, brand) {
  const libs = await loadPdfLibs();
  const name = `dtr-${slug(dtr.student?.name)}-${dtr.official ? 'official' : 'draft'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  buildDtrPdf(libs, dtr, brand).save(name);
}
/** Opens the print dialog on the same document, for a teacher releasing a signed copy. */
export async function printDtr(dtr, brand) {
  const libs = await loadPdfLibs();
  const doc = buildDtrPdf(libs, dtr, brand);
  doc.autoPrint();
  const url = doc.output('bloburl');
  const w = window.open(url, '_blank');
  if (!w) doc.save(`dtr-${slug(dtr.student?.name)}.pdf`); // a blocked pop-up still gets the file
}
