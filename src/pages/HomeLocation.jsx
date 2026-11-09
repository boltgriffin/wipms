import { useEffect, useState } from 'react';
import { Crosshair, Info, MapPin, Navigation, Trash2 } from 'lucide-react';
import MiniMap from '../components/MiniMap';
import AddressSearch from '../components/AddressSearch';
import { ErrorBanner, btnGhost, btnPrimary } from '../components/ui';
import { PageHeader } from '../components/datatable';
import { useHomeLocation, useHomeLocationAction } from '../hooks/useDeploy';
import { GEO_MESSAGES, getPosition } from '../components/geo';
import { distanceMetres, formatDistance } from '../components/distance';

// Bukidnon, so the map opens somewhere recognisable for a student who has no pin and no institution yet.
const FALLBACK = { lat: 7.9986, lng: 125.0 };

/**
 * Optional, and nothing waits on it. A student is placed from the address on the master list; a pin
 * only sharpens the choice between institutions that are already equally near on paper. The page says
 * so plainly, because a student who thinks this is required will worry about getting it exactly right.
 */
export default function HomeLocation() {
  const { data, isLoading, error } = useHomeLocation();
  const save = useHomeLocationAction();
  const [pin, setPin] = useState(null);
  const [locating, setLocating] = useState(false);
  const [msg, setMsg] = useState('');
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (data && pin === null) setPin(data.pinned ? { lat: data.latitude, lng: data.longitude } : null);
  }, [data]); // eslint-disable-line

  if (isLoading) return <p className="text-sm">Loading...</p>;
  if (error) return <ErrorBanner error={error} />;

  const useMyLocation = async () => {
    setGeoError(''); setMsg(''); setLocating(true);
    try { const p = await getPosition(); setPin({ lat: p.lat, lng: p.lng }); }
    catch (e) { setGeoError(GEO_MESSAGES[e.code] || 'Your location could not be read. Tap the map instead.'); }
    setLocating(false);
  };

  const changed = pin && (!data.pinned || pin.lat !== data.latitude || pin.lng !== data.longitude);
  const inst = data.institution;
  const instPin = inst && inst.latitude != null ? { lat: inst.latitude, lng: inst.longitude } : null;

  // Both pins on one map, so "how far away is it" is a thing you can see, not just a number.
  const points = [
    ...(pin ? [{ lat: pin.lat, lng: pin.lng, label: 'Your home', color: '#F59E0B', key: 'home' }] : []),
    ...(instPin ? [{ ...instPin, label: inst.name, color: '#0F766E', key: 'inst' }] : [])
  ];
  const centre = instPin || FALLBACK;

  // Recomputed as the pin moves, so the figure matches what is on screen before anything is saved.
  const away = pin && instPin ? distanceMetres(pin.lat, pin.lng, instPin.lat, instPin.lng) : null;

  return (
    <>
      <PageHeader title="Pin my home location" subtitle="Optional. It helps the school place you somewhere closer to home." />

      <p className="mb-5 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          You do not have to do this. Your placement is worked out from the address on the school&rsquo;s master list, and
          leaving this blank changes nothing you can do in the system. A pin is only used to choose between
          institutions that are already equally near on paper, and you can remove it whenever you like.
        </span>
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-forest-100 bg-white p-5">
          <h2 className="mb-1 text-lg font-bold">Find your home</h2>
          <p className="mb-4 text-sm text-forest-700">Search for your address, or just zoom in and tap where you live. Tap again to move the pin.</p>

          <div className="mb-4">
            <AddressSearch onPick={(r) => { setPin({ lat: r.lat, lng: r.lng }); setMsg(''); }}
              label="Search your address" placeholder="e.g. Poblacion, Valencia City" />
          </div>

          <MiniMap height={380} points={points} onPick={(p) => { setPin(p); setMsg(''); }} center={centre} zoom={pin ? 16 : 11} />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={useMyLocation} disabled={locating} className={`${btnGhost} inline-flex items-center gap-2`}>
              <Crosshair size={15} aria-hidden="true" />{locating ? 'Finding you...' : 'Use my current location'}
            </button>
            {pin && (
              <button onClick={() => { setPin(null); setMsg(''); }} className={btnGhost}>Clear the pin</button>)}
          </div>
          {geoError && <p role="alert" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">{geoError}</p>}
          <p className="mt-3 text-xs text-forest-700">
            Only use your current location while you are actually at home. Pinning from school records the school.
          </p>
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-forest-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">Your address on file</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-forest-700">Address</dt><dd className="font-medium">{data.address || 'Not set'}</dd></div>
              <div><dt className="text-xs text-forest-700">Barangay</dt><dd className="font-medium">{data.barangay || 'Not set'}</dd></div>
              <div><dt className="text-xs text-forest-700">Municipality</dt><dd className="font-medium">{data.municipality || 'Not set'}</dd></div>
              <div><dt className="text-xs text-forest-700">Province</dt><dd className="font-medium">{data.province || 'Not set'}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-forest-700">
              This comes from the master list. If any of it is wrong, tell your work immersion teacher &mdash; it matters more
              than the pin.
            </p>
          </section>

          {inst && (
            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
                <Navigation size={15} aria-hidden="true" />Distance to your placement
              </h2>
              <p className="text-sm font-medium">{inst.name}</p>
              {away != null
                ? (<>
                    <p className="mt-2 text-2xl font-bold">{formatDistance(away)}</p>
                    <p className="mt-1 text-xs text-forest-700">
                      Straight line from your pin, not the distance by road &mdash; the actual trip is longer.
                    </p>
                  </>)
                : (<p className="mt-2 text-sm text-forest-700">
                    {!instPin
                      ? 'This institution has no location on the map yet, so the distance cannot be worked out.'
                      : 'Place your pin to see how far away it is.'}
                  </p>)}
            </section>)}

          <section className="rounded-xl border border-forest-100 bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
              <MapPin size={15} aria-hidden="true" />Your pin
            </h2>
            {pin
              ? <p className="text-sm">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                  {data.pinnedAt && !changed && <span className="mt-1 block text-xs text-forest-700">Saved {String(data.pinnedAt).slice(0, 10)}</span>}</p>
              : <p className="text-sm text-forest-700">No pin set.</p>}

            {msg && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
            <ErrorBanner error={save.error} />

            <div className="mt-4 space-y-2">
              <button disabled={!changed || save.isPending} className={`${btnPrimary} w-full`}
                onClick={() => save.mutate({ latitude: pin.lat, longitude: pin.lng }, { onSuccess: () => setMsg('Your home location has been saved.') })}>
                {save.isPending ? 'Saving...' : 'Save my home location'}
              </button>
              {data.pinned && (
                <button disabled={save.isPending} className={`${btnGhost} inline-flex w-full items-center justify-center gap-2`}
                  onClick={() => save.mutate({ remove: true }, { onSuccess: () => { setPin(null); setMsg('Your home location has been removed.'); } })}>
                  <Trash2 size={15} aria-hidden="true" />Remove my saved location
                </button>)}
            </div>
            <p className="mt-3 text-xs text-forest-700">
              Only the school administrator sees this, and only to work out placements.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
