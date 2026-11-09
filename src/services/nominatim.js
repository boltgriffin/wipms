/**
 * Address search and reverse geocoding, against OpenStreetMap's free Nominatim service.
 *
 * Nominatim is run as a public good by the OSM Foundation and it has a published usage policy with
 * real teeth — a school that ignores it gets its IP blocked, and then nobody's search works. Three
 * rules shape this file:
 *
 *   1. At most one request per second, across the whole application. Every call goes through one
 *      queue, so three components searching at once still take their turn rather than firing three
 *      requests at the same moment.
 *   2. No search-as-you-type. Autocomplete turns one address into eight or ten requests, which is
 *      exactly the traffic the policy exists to stop. The search components call this only when
 *      someone presses Enter or the button — never on a keystroke.
 *   3. Cache, and never repeat an identical query. Results are kept for the session; typing the
 *      same barangay twice costs one request, not two.
 *
 * Requests are also made from the browser, not from Apps Script. That matters: Apps Script's
 * UrlFetchApp would arrive from Google's shared egress addresses, which Nominatim rate-limits hard
 * and often blocks outright, so the school's searches would fail for reasons nobody could see.
 *
 * Bulk geocoding is deliberately not offered here. Running a 400-row master list through this
 * service would breach the policy and is the one use it explicitly forbids. The system does not
 * need it: a student's barangay and municipality already place them for auto-assignment, and a
 * precise pin is optional and set by hand.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org';
const MIN_GAP_MS = 1100;          // the policy's limit is one per second; the extra 100ms is slack
const CACHE_MAX = 120;

/** Every request in the app, in one line, spaced out. */
let chain = Promise.resolve();
let lastAt = 0;

function queued(run) {
  const mine = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return run();
  });
  // The queue must survive a failed request, or one error stops every later search.
  chain = mine.catch(() => {});
  return mine;
}

const cache = new Map();
function remember(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

class GeocodeError extends Error {
  constructor(message, code) { super(message); this.code = code; }
}

async function call(path, params, signal) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new GeocodeError('You are offline, so addresses cannot be searched. You can still place the pin by hand once the map has loaded.', 'OFFLINE');
  }
  const url = new URL(ENDPOINT + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  let res;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new GeocodeError('The address search could not be reached. Check your connection, or place the pin by hand.', 'NETWORK');
  }
  if (res.status === 429 || res.status === 403) {
    throw new GeocodeError('OpenStreetMap is limiting searches from this network right now. Wait a moment, or place the pin on the map by hand.', 'RATE_LIMIT');
  }
  if (!res.ok) throw new GeocodeError(`The address search failed (${res.status}). Place the pin by hand instead.`, 'HTTP');
  return res.json();
}

/**
 * Nominatim's address object, reduced to the three parts this system ranks deployments by.
 *
 * Philippine coverage in OpenStreetMap is uneven: a barangay may come back as `village`, `suburb`,
 * `quarter` or `neighbourhood` depending on who mapped it, and in the cities a `city_district` is
 * often the barangay. Several keys are tried for each part rather than trusting one.
 */
export function addressParts(a = {}) {
  const first = (...keys) => { for (const k of keys) if (a[k]) return String(a[k]); return ''; };
  const municipality = first('city', 'town', 'municipality', 'village');
  return {
    barangay: first('village', 'suburb', 'quarter', 'neighbourhood', 'city_district', 'hamlet') || '',
    // `village` can stand for either, so it is only the municipality when nothing else claimed it
    municipality: municipality === a.village && a.village === a.suburb ? '' : municipality,
    province: first('province', 'state', 'region') || '',
    country: first('country') || ''
  };
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Searches for a place by address. Call this on submit, never on a keystroke.
 *
 * Results are biased to the Philippines; `countrycodes` keeps a search for "Poblacion" from
 * returning a Poblacion in Mexico, of which there are many.
 */
export async function searchAddress(query, { signal, limit = 8 } = {}) {
  const q = norm(query);
  if (q.length < 3) throw new GeocodeError('Type at least three characters to search.', 'TOO_SHORT');
  const key = 's:' + q + ':' + limit;
  if (cache.has(key)) return cache.get(key);

  const raw = await queued(() => call('/search', {
    q: query.trim(), format: 'jsonv2', addressdetails: 1, limit, countrycodes: 'ph', 'accept-language': 'en'
  }, signal));

  const out = (Array.isArray(raw) ? raw : []).map((r) => ({
    id: `${r.osm_type || 'x'}/${r.osm_id || r.place_id}`,
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    kind: r.addresstype || r.type || '',
    parts: addressParts(r.address)
  })).filter((r) => isFinite(r.lat) && isFinite(r.lng));
  remember(key, out);
  return out;
}

/** The address at a point, for when someone drops the pin first and the form fills itself in. */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  const key = `r:${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (cache.has(key)) return cache.get(key);

  const r = await queued(() => call('/reverse', {
    lat, lon: lng, format: 'jsonv2', addressdetails: 1, zoom: 18, 'accept-language': 'en'
  }, signal));

  if (!r || r.error) throw new GeocodeError('No address was found at that point. The pin is still saved; type the address yourself.', 'NOT_FOUND');
  const out = { label: r.display_name || '', lat: Number(r.lat), lng: Number(r.lon), parts: addressParts(r.address) };
  remember(key, out);
  return out;
}

/** Only for tests and for a sign-out; the cache is otherwise session-lived and harmless. */
export function clearGeocodeCache() { cache.clear(); }

export { GeocodeError };
