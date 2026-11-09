/**
 * Pick a point on the map: by searching an address, by tapping, by dragging the pin, or by using
 * the device's own location.
 *
 * Four ways in, because none of them works everywhere. Search misses half the puroks in Bukidnon.
 * The device's location is only useful to someone standing at the place. Tapping needs you to
 * recognise the roads. Between them, somebody can always place the pin.
 *
 * Whatever puts the pin down, the coordinates are what gets saved. The address the service reports
 * back is offered to the form as a convenience and never silently overwrites what a person typed.
 */
import { useEffect, useRef, useState } from 'react';
import { Crosshair, Loader2, Trash2 } from 'lucide-react';
import AddressSearch from './AddressSearch';
import MapView from './MapView';
import { reverseGeocode } from '../services/nominatim';
import { inputCls } from './ui';

// Central Philippines, used only when there is nothing at all to centre on.
const FALLBACK = { lat: 12.8797, lng: 121.774 };
const RADIUS_MIN = 10, RADIUS_MAX = 5000, SLIDER_MAX = 1000;

export default function MapPicker({
  value, onChange, onAddress,
  radius = null, onRadiusChange = null,
  center = null, height = 320,
  extraPoints = [], label = 'Location'
}) {
  const [lookingUp, setLookingUp] = useState(false);
  const [found, setFound] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const abort = useRef(null);

  useEffect(() => () => abort.current?.abort(), []);

  /** Ask what is at this point, so the form can offer to fill the address in. */
  const describe = async (pt) => {
    if (!onAddress) return;
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setLookingUp(true); setFound('');
    try {
      const r = await reverseGeocode(pt.lat, pt.lng, { signal: ctl.signal });
      setFound(r.label);
      onAddress(r);
    } catch (e) {
      if (e.name !== 'AbortError') setFound('');
    } finally {
      if (abort.current === ctl) setLookingUp(false);
    }
  };

  const place = (pt) => { onChange(pt); describe(pt); };

  const fromSearch = (r) => {
    onChange({ lat: r.lat, lng: r.lng });
    setFound(r.label);
    onAddress?.({ label: r.label, parts: r.parts, lat: r.lat, lng: r.lng });
  };

  const useMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('This device cannot report its location.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        place({ lat: Number(p.coords.latitude.toFixed(6)), lng: Number(p.coords.longitude.toFixed(6)) });
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === 1
          ? 'Location permission was refused. Allow it in your browser settings, or place the pin by hand.'
          : 'Your location could not be read just now. Place the pin by hand instead.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const pin = value && isFinite(value.lat) && isFinite(value.lng) ? value : null;
  const points = [
    ...(pin ? [{ ...pin, key: 'pin', label: label, color: '#C8861D' }] : []),
    ...extraPoints
  ];

  return (
    <div className="space-y-3">
      <AddressSearch onPick={fromSearch} />

      <MapView
        points={points}
        circle={pin && radius ? { ...pin, radius: Number(radius) } : null}
        height={height}
        draggable={!!pin}
        onMove={place}
        onPick={place}
        center={pin || center || FALLBACK}
        zoom={pin ? 16 : center ? 13 : 6}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={useMyLocation} disabled={locating}
          className="inline-flex items-center gap-1.5 rounded border border-forest-800 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
          {locating ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Crosshair size={13} aria-hidden="true" />}
          {locating ? 'Finding you...' : 'Use my current location'}
        </button>
        {pin && (
          <button type="button" onClick={() => { onChange(null); setFound(''); }}
            className="inline-flex items-center gap-1.5 rounded border border-forest-800 px-3 py-1.5 text-xs font-semibold">
            <Trash2 size={13} aria-hidden="true" />Clear pin
          </button>)}
        {pin && <span className="font-mono text-xs text-forest-700">{pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}</span>}
      </div>

      {geoError && <p role="alert" className="rounded bg-amber-50 p-2.5 text-sm">{geoError}</p>}
      {lookingUp && <p className="text-xs text-forest-700">Looking up the address at that point...</p>}
      {!lookingUp && found && <p className="text-xs text-forest-700"><span className="font-semibold">At this pin:</span> {found}</p>}
      {!pin && <p className="text-xs text-forest-700">No pin yet. Search above, tap the map, or use your current location.</p>}

      {onRadiusChange && (
        <fieldset className="rounded border border-forest-100 p-3">
          <legend className="px-1 text-xs font-bold">Attendance radius</legend>
          <p className="mb-2 text-xs text-forest-700">
            How close a student must be for a scan to count as GPS verified. The shaded circle on the map is
            this distance. Leave it blank to use the school-wide default.
          </p>
          <div className="flex items-center gap-3">
            <input type="range" min={RADIUS_MIN} max={SLIDER_MAX} step={10}
              value={Math.min(Number(radius) || 150, SLIDER_MAX)}
              onChange={(e) => onRadiusChange(e.target.value)} className="h-2 flex-1 accent-amber-600"
              aria-label="Attendance radius in metres" disabled={!pin} />
            <span className="w-20 shrink-0">
              <input className={inputCls} inputMode="numeric" value={radius ?? ''}
                onChange={(e) => onRadiusChange(e.target.value)} placeholder="150" aria-label="Radius in metres" />
            </span>
            <span className="text-xs text-forest-700">m</span>
          </div>
          <p className="mt-2 text-xs text-forest-700">
            Phone GPS is commonly accurate to 10&ndash;30 m outdoors and much worse inside a building, so a
            radius under about 50 m will reject honest scans. The slider covers {RADIUS_MIN}&ndash;{SLIDER_MAX} m,
            which suits almost every site; for a larger campus type the figure, up to {RADIUS_MAX} m.
          </p>
        </fieldset>)}
    </div>
  );
}
