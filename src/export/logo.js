// The WIPMS mark drawn with jsPDF primitives rather than an embedded image, so it stays sharp at any
// print size and adds nothing to the file. Geometry matches components/AppLogo.jsx exactly.
const G = { box: 32, radius: 7.5, am: { x: 9, y: 4, w: 6, h: 16, r: 3 }, pm: { x: 17, y: 14, w: 6, h: 14, r: 3 } };
const TILE = [15, 118, 110], AM = [255, 255, 255], PM = [245, 158, 11], MONO = [18, 49, 43];

/**
 * Draws the mark with its top-left corner at (x, y), `size` points across.
 * `mono` draws the one-colour version for a page that may be photocopied.
 */
export function drawAppLogo(doc, x, y, size = 28, mono = false) {
  const u = size / G.box;                    // one viewBox unit in points
  const box = (r, fill) => doc.roundedRect(x + r.x * u, y + r.y * u, r.w * u, r.h * u, r.r * u, r.r * u, fill);
  if (mono) {
    doc.setDrawColor(...MONO); doc.setLineWidth(Math.max(0.5, 1.6 * u));
    doc.roundedRect(x, y, size, size, G.radius * u, G.radius * u, 'S');
    doc.setFillColor(...MONO); box(G.am, 'F');
    doc.setFillColor(120, 140, 136); box(G.pm, 'F');   // the lighter half, still legible in grey
  } else {
    doc.setFillColor(...TILE);
    doc.roundedRect(x, y, size, size, G.radius * u, G.radius * u, 'F');
    doc.setFillColor(...AM); box(G.am, 'F');
    doc.setFillColor(...PM); box(G.pm, 'F');
  }
  doc.setFillColor(0); doc.setDrawColor(0);
  return x + size;                            // where the next thing can start
}
