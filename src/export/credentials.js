// Credential exports: a spreadsheet to keep, and printable slips to cut up and hand out.
import { loadPdfLibs } from './pdf';
import { drawAppLogo } from './logo';
import { newWorkbook, saveWorkbook } from './excel';

const BRAND = [18, 49, 43];
const PT = { W: 595.28, H: 841.89 };              // A4 portrait
const MARGIN = 32, GAP = 12, COLS = 2, ROWS = 5;  // ten slips to a sheet
const SLIP_W = (PT.W - MARGIN * 2 - GAP) / COLS;
const SLIP_H = (PT.H - MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * One slip per person, cut along the lines. The password is printed in a monospaced face because a
 * student copying it by hand has to tell a 1 from an l and a 0 from an O.
 */
function drawSlip(doc, x, y, u, brand) {
  doc.setDrawColor(190); doc.setLineWidth(0.5);
  doc.setLineDashPattern([3, 2], 0);
  doc.rect(x, y, SLIP_W, SLIP_H);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(...BRAND);
  doc.rect(x, y, SLIP_W, 24, 'F');
  drawAppLogo(doc, x + 7, y + 5, 14);
  doc.setTextColor(255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
  doc.text(String(brand?.systemName || 'Work Immersion Monitoring System').toUpperCase(), x + 26, y + 15, { maxWidth: SLIP_W - 34 });

  doc.setTextColor(0);
  let cy = y + 34;
  const line = (label, value, mono) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110);
    doc.text(label, x + 8, cy);
    doc.setTextColor(0); doc.setFontSize(mono ? 11 : 9.5);
    doc.setFont(mono ? 'courier' : 'helvetica', 'bold');
    doc.text(String(value || '—'), x + 8, cy + 12, { maxWidth: SLIP_W - 16 });
    cy += 25;
  };
  line('Name', u.fullName);
  line('Role', u.role);
  line('Username', u.username, true);
  line('Password', u.password, true);

  doc.setFont('helvetica', 'italic'); doc.setFontSize(6); doc.setTextColor(120);
  doc.text(`${brand?.schoolName || ''}`.slice(0, 60), x + 8, y + SLIP_H - 7, { maxWidth: SLIP_W - 62 });
  doc.text(stamp(), x + SLIP_W - 8, y + SLIP_H - 7, { align: 'right' });
  doc.setTextColor(0);
}

export function buildCredentialSlips({ jsPDF }, users, brand) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const perPage = COLS * ROWS;
  users.forEach((u, i) => {
    if (i > 0 && i % perPage === 0) doc.addPage();
    const k = i % perPage, col = k % COLS, row = Math.floor(k / COLS);
    drawSlip(doc, MARGIN + col * (SLIP_W + GAP), MARGIN + row * (SLIP_H + GAP), u, brand);
  });
  if (!users.length) {
    doc.setFontSize(11);
    doc.text('No credentials to print. Every account listed has a password only its owner knows.', MARGIN, 80, { maxWidth: PT.W - MARGIN * 2 });
  }
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(130);
    doc.text(`Confidential. Hand each slip to the named person only. Page ${i} of ${n}.`, MARGIN, PT.H - 16);
    doc.setTextColor(0);
  }
  return doc;
}

export async function exportCredentialSlips(users, brand) {
  const libs = await loadPdfLibs();
  buildCredentialSlips(libs, users, brand).save(`wipms-account-slips-${stamp()}.pdf`);
}

/** The spreadsheet the school keeps. Everything is written as text so an ID never becomes a number. */
export async function exportCredentialsXlsx(users, brand) {
  const wb = await newWorkbook();
  const ws = wb.addWorksheet('Credentials');
  ws.columns = [{ width: 32 }, { width: 14 }, { width: 22 }, { width: 22 }, { width: 12 }, { width: 28 }];
  const title = ws.addRow([`${brand?.schoolName || 'WIPMS'} — account credentials`]);
  title.font = { bold: true, size: 14 };
  ws.addRow([`Generated ${stamp()}. Confidential: hand each row to the named person only.`]).font = { italic: true, size: 9 };
  ws.addRow([]);
  const head = ws.addRow(['Full name', 'Role', 'Username', 'Password', 'Status', 'Linked record']);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12312B' } }; });
  users.forEach((u) => {
    const r = ws.addRow([u.fullName, u.role, u.username, u.password, u.status, u.linkedTo || '']);
    // Text format, so "2026-0001" is not read as a date or a sum.
    r.getCell(3).numFmt = '@'; r.getCell(4).numFmt = '@';
  });
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  await saveWorkbook(wb, `wipms-credentials-${stamp()}.xlsx`);
}
