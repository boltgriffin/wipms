// Civil Service Form No. 48, the monthly Daily Time Record. Two identical copies on one A4 sheet, as
// the printed form does, so one can be cut off and filed. jsPDF is imported only when someone exports.
import { loadPdfLibs } from './pdf';
import { drawAppLogo } from './logo';

const PT = { W: 595.28, H: 841.89 };      // A4 portrait
const MARGIN = 34, GUTTER = 24;
const COPY_W = (PT.W - MARGIN * 2 - GUTTER) / 2;
// Day | AM arrival | AM departure | PM arrival | PM departure | Undertime hours | Undertime minutes.
// Widths are shares of one copy, so the two halves always fit the sheet whatever the margins become.
const SHARE = [0.085, 0.178, 0.178, 0.178, 0.178, 0.1015, 0.1015];
const COL = SHARE.map((s) => s * COPY_W);
const ROW_H = 11.4, HEAD_H = 12.5;
const LINE = 0.6, THICK = 1.4;
const CERT = 'I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.';

const dash = (v) => (v === null || v === undefined || v === '' ? '' : String(v));

/** One copy of the form, drawn from (x, y). Returns nothing; the caller places the second copy. */
function drawCopy(doc, x, y, data, brand) {
  const tableW = COL.reduce((a, b) => a + b, 0);
  const right = x + tableW;
  let cy = y;

  doc.setTextColor(0);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.text('Civil Service Form No. 48', x, cy);
  cy += 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('DAILY TIME RECORD', x + tableW / 2, cy, { align: 'center' });
  cy += 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('-----o0o-----', x + tableW / 2, cy, { align: 'center' });

  // Name, on the rule, as the form has it
  cy += 24;
  doc.setLineWidth(LINE); doc.setDrawColor(0);
  doc.line(x, cy, right, cy);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(String(data.student?.name || ''), x + tableW / 2, cy - 3, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  doc.text('(Name)', x + tableW / 2, cy + 8, { align: 'center' });

  // For the month of / official hours. The rules are placed as fractions of the copy so the two
  // halves stay identical and neither can bleed into the other.
  cy += 22;
  const lab = x + tableW * 0.34, val = x + tableW * 0.46;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.6);
  doc.text('For the month of', x, cy);
  doc.line(lab, cy + 1.5, right, cy + 1.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6);
  doc.text(String(data.label || ''), lab + 5, cy);

  cy += 12.5;
  doc.setFont('helvetica', 'italic');
  doc.text('Official hours for', x + 6, cy);
  doc.text('Regular days', lab - 6, cy);
  doc.line(val + 20, cy + 1.5, right, cy + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.official?.regularLabel || data.official?.regular || ''), val + 25, cy);

  cy += 11.5;
  doc.setFont('helvetica', 'italic');
  doc.text('arrival and departure', x, cy);
  doc.text('Saturdays', lab + 2, cy);
  doc.line(val + 20, cy + 1.5, right, cy + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.text(String(data.official?.saturdayLabel || data.official?.saturday || ''), val + 25, cy);

  // ---- the grid ----
  cy += 12;
  const top = cy;
  const xs = [x];
  COL.forEach((w) => xs.push(xs[xs.length - 1] + w));

  doc.setFontSize(7.5);
  const cell = (text, cx, cw, cyy, ch, opts = {}) => {
    if (text === '') return;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.text(String(text), opts.align === 'left' ? cx + 3 : cx + cw / 2, cyy + ch / 2 + 2.4,
      { align: opts.align === 'left' ? 'left' : 'center', maxWidth: cw - 4 });
  };

  // header band 1: Day (spans both header rows) | A.M. | P.M. | Undertime
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  cell('A.M.', xs[1], COL[1] + COL[2], top, HEAD_H, { bold: true });
  cell('P.M.', xs[3], COL[3] + COL[4], top, HEAD_H, { bold: true });
  cell('Undertime', xs[5], COL[5] + COL[6], top, HEAD_H, { bold: true });
  // header band 2
  const h2 = top + HEAD_H;
  doc.setFontSize(6.6);
  cell('Day', xs[0], COL[0], top, HEAD_H * 2, { bold: true });
  ['Arrival', 'Depar-\nture', 'Arrival', 'Depar-\nture', 'Hours', 'Min-\nutes'].forEach((t, i) => {
    const parts = t.split('\n'), cx = xs[i + 1], cw = COL[i + 1];
    doc.setFont('helvetica', 'bold');
    parts.forEach((line, k) => doc.text(line, cx + cw / 2, h2 + (parts.length === 1 ? HEAD_H / 2 + 2.4 : 5.6 + k * 6), { align: 'center' }));
  });

  // day rows
  const bodyTop = h2 + HEAD_H;
  const n = data.daysInMonth || 31;
  doc.setFontSize(7);
  for (let i = 0; i < 31; i++) {
    const ry = bodyTop + i * ROW_H, d = (data.days || [])[i];
    cell(String(i + 1), xs[0], COL[0], ry, ROW_H, { bold: true });
    if (i + 1 > n) { // a short month: grey the rows that do not exist
      doc.setFillColor(242, 242, 242);
      doc.rect(xs[1], ry, tableW - COL[0], ROW_H, 'F');
      continue;
    }
    if (!d) continue;
    [d.amIn, d.amOut, d.pmIn, d.pmOut].forEach((v, k) => cell(dash(v), xs[k + 1], COL[k + 1], ry, ROW_H));
    cell(dash(d.undertimeHours), xs[5], COL[5], ry, ROW_H);
    cell(dash(d.undertimeMinutes), xs[6], COL[6], ry, ROW_H);
  }

  // total row
  const totalY = bodyTop + 31 * ROW_H;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Total', xs[5] - 5, totalY + ROW_H / 2 + 2.4, { align: 'right' }); // right-aligned, as on the form
  doc.setFont('helvetica', 'bold');
  cell(String(data.totals?.undertimeHours ?? ''), xs[5], COL[5], totalY, ROW_H, { bold: true });
  cell(String(data.totals?.undertimeMinutes ?? ''), xs[6], COL[6], totalY, ROW_H, { bold: true });

  // grid lines, drawn last so no fill covers them
  const gridBottom = totalY + ROW_H;
  doc.setLineWidth(LINE);
  doc.line(x, top, right, top);
  doc.line(xs[1], h2, right, h2); // stops at the Day column, which spans both header rows
  doc.line(x, bodyTop, right, bodyTop);
  for (let i = 1; i <= 31; i++) doc.line(x, bodyTop + i * ROW_H, right, bodyTop + i * ROW_H);
  doc.setLineWidth(THICK);
  doc.line(x, gridBottom, right, gridBottom);
  doc.setLineWidth(LINE);
  xs.forEach((cx, i) => {
    // the Day column rule runs the whole height; the rest start below the first header band
    const from = i === 0 || i === xs.length - 1 ? top : (i === 1 || i === 3 || i === 5 ? top : h2);
    doc.line(cx, from, cx, i === 0 || i === xs.length - 1 ? gridBottom : totalY);
  });
  doc.line(xs[5], totalY, xs[5], gridBottom);    // keep the undertime boxes closed on the total row
  doc.line(xs[6], totalY, xs[6], gridBottom);

  // ---- certification and signatures ----
  let fy = gridBottom + 16;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.6);
  const certLines = doc.splitTextToSize(CERT, tableW);
  doc.text(certLines, x, fy, { lineHeightFactor: 1.35 });
  fy += certLines.length * 8.6 + 12;           // measured, so a longer wrap cannot collide
  doc.setLineWidth(THICK); doc.line(x, fy, right, fy);
  fy += 16;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
  doc.text('VERIFIED as to the prescribed office hours:', x, fy);
  fy += 26;
  doc.setLineWidth(THICK); doc.line(x, fy, right, fy);
  if (data.official_copy && data.approvedBy) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(String(data.approvedBy), x + tableW / 2, fy - 3, { align: 'center' });
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
  doc.text('In Charge', x + tableW / 2, fy + 9, { align: 'center' });

  // A draft is stamped so it can never be mistaken for a filed copy.
  if (!data.official_copy) {
    doc.saveGraphicsState();
    if (doc.GState) doc.setGState(new doc.GState({ opacity: 0.09 }));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(54); doc.setTextColor(18, 49, 43);
    doc.text('DRAFT', x + tableW / 2, top + 220, { align: 'center', angle: 34 });
    doc.restoreGraphicsState();
    doc.setTextColor(0);
  }
  // A quiet provenance line, outside the form proper, so the printed form itself stays standard. The
  // mark is the one-colour version and sits only here: an official form is never altered by branding.
  drawAppLogo(doc, x, PT.H - MARGIN + 3, 8, true);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(120);
  doc.text(`${brand?.schoolName || 'WIPMS'} · ${data.totals?.hours ?? 0} hours rendered this month`, x + 11, PT.H - MARGIN + 10, { maxWidth: tableW - 11 });
  doc.setTextColor(0);
}

export function buildCsForm48({ jsPDF }, data, brand) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawCopy(doc, MARGIN, MARGIN + 10, data, brand);
  drawCopy(doc, MARGIN + COPY_W + GUTTER, MARGIN + 10, data, brand);
  return doc;
}

const slug = (x) => String(x || 'dtr').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'dtr';
const fileName = (d) => `csform48-${slug(d.student?.name)}-${d.month}${d.official_copy ? '' : '-draft'}.pdf`;

export async function exportCsForm48(data, brand) {
  const libs = await loadPdfLibs();
  buildCsForm48(libs, data, brand).save(fileName(data));
}
export async function printCsForm48(data, brand) {
  const libs = await loadPdfLibs();
  const doc = buildCsForm48(libs, data, brand);
  doc.autoPrint();
  const w = window.open(doc.output('bloburl'), '_blank');
  if (!w) doc.save(fileName(data)); // a blocked pop-up still gets the file
}
