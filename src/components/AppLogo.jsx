/**
 * The WIPMS mark.
 *
 * Two staggered bars: the morning and the afternoon of an immersion day, offset across the lunch
 * break the system deducts. That is the shape of the daily time record this whole system produces,
 * so the mark says what the product is rather than borrowing a clock or a progress ring.
 *
 * Deliberately square, because it sits beside the school's circular seal on the sign-in page and on
 * every report header; a second circle there would compete with the seal instead of supporting it.
 * The bars are staggered and unequal so the mark cannot be read as a pause button, which is what two
 * aligned bars in a rounded square would be.
 *
 * One mark everywhere: the same teal tile on white paper, on the deep teal sidebar and in a PDF
 * header, so people recognise it in one glance rather than learning three variants.
 */
export const LOGO_GEOMETRY = {
  box: 32, radius: 7.5,
  am: { x: 9, y: 4, w: 6, h: 16, r: 3 },   // morning, anchored high
  pm: { x: 17, y: 14, w: 6, h: 14, r: 3 }  // afternoon, anchored low
};
export const LOGO_COLORS = { tile: '#0F766E', am: '#FFFFFF', pm: '#F59E0B', mono: '#12312B' };

/**
 * `tone` picks the treatment: "brand" is the teal tile, "mono" is a single-colour version for a fax,
 * a photocopy or a one-colour print run, where amber on white would vanish.
 */
export default function AppLogo({ size = 36, tone = 'brand', title, className = '' }) {
  const g = LOGO_GEOMETRY, c = LOGO_COLORS;
  const mono = tone === 'mono';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${g.box} ${g.box}`} className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : 'true'} focusable="false">
      {title && <title>{title}</title>}
      <rect width={g.box} height={g.box} rx={g.radius} fill={mono ? 'none' : c.tile}
        stroke={mono ? c.mono : 'none'} strokeWidth={mono ? 2 : 0} />
      <rect x={g.am.x} y={g.am.y} width={g.am.w} height={g.am.h} rx={g.am.r} fill={mono ? c.mono : c.am} />
      <rect x={g.pm.x} y={g.pm.y} width={g.pm.w} height={g.pm.h} rx={g.pm.r} fill={mono ? c.mono : c.pm}
        opacity={mono ? 0.45 : 1} />
    </svg>
  );
}
