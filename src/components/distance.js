/**
 * Straight-line distance, for showing a student how far their deployment is.
 *
 * This is the same great-circle formula the backend uses to check GPS attendance, so a distance
 * shown on screen and a distance judged by the server agree. It is as the crow flies, not by road:
 * a student in Valencia City reading "4.2 km" should understand that the jeepney route is longer.
 * Anything that implied a travel time would be a guess dressed up as a fact.
 */
const R = 6371000; // mean Earth radius, metres
const rad = (d) => (d * Math.PI) / 180;

export function distanceMetres(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((n) => typeof n === 'number' && isFinite(n))) return null;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Metres below a kilometre, kilometres above it — nobody reads "4238 m". */
export function formatDistance(m) {
  if (m == null || !isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}
