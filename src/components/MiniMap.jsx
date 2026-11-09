/**
 * The small read-mostly map used by the attendance and GPS-review screens.
 *
 * Its props have not changed — this is the same component those pages already call. What changed is
 * underneath: Leaflet is now bundled and driven through react-leaflet instead of being fetched from
 * a CDN at runtime, so it works in the installed app with no connection (tiles still need the
 * network; the map itself no longer fails to load).
 */
import MapView from './MapView';

export default function MiniMap({ points = [], circle = null, height = 260, draggable = false, onMove, onPick, center = null, zoom = 13 }) {
  const has = points.some((p) => p && isFinite(p.lat) && isFinite(p.lng));
  if (!has && !circle && !onPick) {
    return <p className="rounded border border-dashed border-forest-100 p-6 text-center text-sm text-forest-700">No location to show.</p>;
  }
  return <MapView points={points} circle={circle} height={height} draggable={draggable}
    onMove={onMove} onPick={onPick} center={center} zoom={zoom} />;
}
