export const GEO_MESSAGES = {
  DENIED: "Location permission is blocked. Tap the lock icon in your browser's address bar, set Location to Allow, then try again. On iPhone: Settings > Privacy & Security > Location Services > your browser > While Using the App.",
  UNAVAILABLE: 'Your device could not find its location. Turn on GPS and try again.',
  TIMEOUT: 'Finding your location took too long. Move to an open area and try again.',
  UNSUPPORTED: 'This browser does not support location. Try Chrome or Safari.'
};

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject({ code: 'UNSUPPORTED' });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, ageMs: Math.max(0, Date.now() - p.timestamp) }),
      (e) => reject({ code: e.code === 1 ? 'DENIED' : e.code === 2 ? 'UNAVAILABLE' : 'TIMEOUT' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export const MODE_LABEL = { VERIFIED: 'Verified', CAPTURED_ONLY: 'Location captured', FLAGGED: 'Flagged for review' };
export const MODE_TONE = { VERIFIED: 'bg-green-100 text-green-800', CAPTURED_ONLY: 'bg-blue-100 text-blue-800', FLAGGED: 'bg-amber-100 text-amber-800' };
export const FLAG_TEXT = {
  OUTSIDE_RADIUS: 'Outside the allowed area',
  LOW_ACCURACY: 'GPS accuracy below the minimum',
  STALE_FIX: 'Location reading was out of date',
  OFFLINE_SYNC: 'Saved offline and sent later',
  NO_SELFIE: 'No photo attached',
  NO_INSTITUTION_COORDS: 'Institution has no GPS location yet',
  LOW_CONFIDENCE: 'Overall confidence below the threshold',
  TEACHER_ACCEPTED: 'Accepted by a teacher',
  TEACHER_REJECTED: 'Rejected by a teacher'
};
export const flagText = (f) => FLAG_TEXT[f] || f;

/** Shrinks a camera photo so a phone picture fits the 2 MB limit, and returns it base64-encoded. */
export async function prepareSelfie(file) {
  if (!/^image\/(jpeg|png)$/.test(file.type)) throw new Error('The photo must be a JPG or PNG');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const data = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  if (data.length * 0.75 > 2 * 1024 * 1024) throw new Error('The photo is too large even after shrinking');
  return { mimeType: 'image/jpeg', data };
}
