/**
 * An institution on the map, read-only, with the circle a student has to be standing inside for a
 * scan to count as GPS verified.
 *
 * The circle is the point of this view. A radius looks like an abstract number in a form field, and
 * then someone sets 30 m on a factory with a car park and wonders why half the class is marked
 * outside. Drawn over the roofs it is obvious.
 */
import { Modal, btnGhost } from './ui';
import MapView from './MapView';

const DEFAULT_NOTE = 'No radius of its own, so the school-wide default applies.';

export default function InstitutionMapModal({ institution, onClose }) {
  const has = institution.latitude != null && institution.longitude != null;
  const pin = has ? { lat: institution.latitude, lng: institution.longitude } : null;
  const radius = institution.allowedRadiusMeters || null;

  return (
    <Modal title={institution.institutionName} onClose={onClose} wide>
      {has ? (<>
        <MapView
          points={[{ ...pin, label: institution.institutionName, color: '#0F766E', key: 'i' }]}
          circle={radius ? { ...pin, radius } : null}
          height={420}
          zoom={16}
        />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-forest-700">Address</dt><dd className="font-medium">{institution.address}</dd></div>
          <div><dt className="text-xs text-forest-700">Coordinates</dt>
            <dd className="font-mono text-xs">{institution.latitude.toFixed(6)}, {institution.longitude.toFixed(6)}</dd></div>
          <div><dt className="text-xs text-forest-700">Attendance radius</dt>
            <dd className="font-medium">{radius ? `${radius} m` : 'School default'}</dd></div>
        </dl>
        {!radius && <p className="mt-2 text-xs text-forest-700">{DEFAULT_NOTE}</p>}
      </>) : (
        <p className="rounded-lg bg-amber-50 p-4 text-sm">
          This institution has no location on the map yet. Scans made here are recorded as
          <span className="font-medium"> NON_GPS_VERIFIED</span>: students can still time in and out, but there is
          nothing to check them against. Edit the institution to place it on the map.
        </p>)}
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className={btnGhost}>Close</button>
      </div>
    </Modal>
  );
}
