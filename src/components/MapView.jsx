/**
 * The map, on react-leaflet and OpenStreetMap tiles. No API key, no bill, no account.
 *
 * Two decisions worth knowing about:
 *
 * Leaflet is bundled rather than pulled from a CDN. The app is installable and runs offline, and a
 * CDN <script> tag simply fails with no connection — the whole page would break rather than the
 * map politely saying it cannot load tiles. Bundled, the component renders either way.
 *
 * Markers are drawn with divIcon, not Leaflet's stock marker. The stock one loads its image by a
 * relative URL that bundlers rewrite and then 404s, which is the single most common broken thing in
 * a bundled Leaflet app. Inline SVG has no such problem, costs no request, and takes the brand
 * colours in both themes.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TEAL = '#0F766E';
const AMBER = '#C8861D';

const round6 = (n) => Number(Number(n).toFixed(6));
const valid = (p) => p && isFinite(p.lat) && isFinite(p.lng);

/** A teardrop pin. `bob` lifts it slightly while being dragged so the point stays visible. */
const pinIcon = (color) => L.divIcon({
  className: 'wipms-pin',
  html: `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 39C15 39 28 23.5 28 14A13 13 0 1 0 2 14c0 9.5 13 25 13 25z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
    <circle cx="15" cy="14" r="4.5" fill="#fff"/></svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 39],     // the tip, not the middle, is the coordinate
  tooltipAnchor: [0, -34]
});

/** Leaflet measures itself on creation; inside a modal or a tab that is zero pixels wide. */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const fix = () => map.invalidateSize({ animate: false });
    const t = setTimeout(fix, 60);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fix) : null;
    ro?.observe(el);
    return () => { clearTimeout(t); ro?.disconnect(); };
  }, [map]);
  return null;
}

/** Keeps everything in view as pins move, without fighting the user once they have panned. */
function Frame({ bounds, center, zoom, follow }) {
  const map = useMap();
  const last = useRef('');
  useEffect(() => {
    const sig = JSON.stringify(bounds) + '|' + JSON.stringify(center) + '|' + follow;
    if (sig === last.current) return;
    last.current = sig;
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 17 });
    else if (bounds.length === 1) map.setView(bounds[0], Math.max(map.getZoom(), zoom));
    else if (valid(center)) map.setView([center.lat, center.lng], zoom);
  }, [map, bounds, center, zoom, follow]);
  return null;
}

function Clicks({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: round6(e.latlng.lat), lng: round6(e.latlng.lng) }) });
  return null;
}

/**
 * points   [{ lat, lng, label, color }] — the first is the draggable one when `draggable` is set
 * circle   { lat, lng, radius } — the GPS radius around an institution
 * onPick   tap anywhere to place the pin
 * onMove   fired when the pin is dragged
 */
export default function MapView({
  points = [], circle = null, height = 280, draggable = false, onMove, onPick,
  center = null, zoom = 13, interactive = true, className = ''
}) {
  const shown = useMemo(() => points.filter(valid), [points]);
  const bounds = useMemo(() => {
    const b = shown.map((p) => [p.lat, p.lng]);
    if (valid(circle)) b.push([circle.lat, circle.lng]);
    return b;
  }, [shown, circle]);

  const start = valid(center) ? [center.lat, center.lng] : bounds[0] || [12.8797, 121.774]; // the Philippines, if nothing else is known

  return (
    <MapContainer
      center={start}
      zoom={zoom}
      scrollWheelZoom={!!onPick}
      dragging={interactive}
      doubleClickZoom={interactive}
      style={{ height, width: '100%' }}
      className={`rounded-lg border border-forest-100 ${className}`}
      aria-label={onPick ? 'Map. Tap to place the pin, or drag it.' : 'Map of the recorded locations'}
      role={onPick ? 'application' : 'img'}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <AutoResize />
      <Frame bounds={bounds} center={center} zoom={zoom} follow={draggable} />
      {onPick && <Clicks onPick={onPick} />}

      {valid(circle) && (
        <Circle center={[circle.lat, circle.lng]} radius={Math.max(1, circle.radius || 100)}
          pathOptions={{ color: TEAL, fillColor: TEAL, fillOpacity: 0.12, weight: 2 }} />)}

      {shown.map((p, i) => (
        draggable && i === 0
          ? (<Marker key={p.key || i} position={[p.lat, p.lng]} draggable icon={pinIcon(p.color || AMBER)}
              eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onMove?.({ lat: round6(ll.lat), lng: round6(ll.lng) }); } }}>
              {p.label && <Tooltip direction="top">{p.label}</Tooltip>}
            </Marker>)
          : (<CircleMarker key={p.key || i} center={[p.lat, p.lng]} radius={8}
              pathOptions={{ color: p.color || AMBER, fillColor: p.color || AMBER, fillOpacity: 0.9, weight: 2 }}>
              {p.label && <Tooltip direction="top">{p.label}</Tooltip>}
            </CircleMarker>)
      ))}
    </MapContainer>
  );
}
