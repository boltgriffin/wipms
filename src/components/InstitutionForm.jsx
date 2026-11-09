import { useState } from 'react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui';
import MapPicker from './MapPicker';
import { useInstitutionAction } from '../hooks/useManagement';

const BLANK = {
  institutionName: '', industryType: '', contactPerson: '', contactNumber: '', email: '', address: '',
  availableSlots: '', latitude: '', longitude: '', allowedRadiusMeters: '',
  // Filled from the map when a place is picked. The server falls back to parsing the address when
  // these are blank, so they are an improvement on that guess, never a requirement.
  barangay: '', municipality: '', province: ''
};

function validate(f) {
  const e = {};
  ['institutionName', 'contactPerson', 'address'].forEach((k) => { if (!String(f[k]).trim()) e[k] = 'This field is required'; });
  if (!f.industryType) e.industryType = 'Choose an industry type';
  if (!/^[0-9+()\-\s]{7,20}$/.test(f.contactNumber)) e.contactNumber = 'Enter a valid phone number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email';
  const n = Number(f.availableSlots);
  if (f.availableSlots === '' || !Number.isInteger(n) || n < 0 || n > 500) e.availableSlots = 'Enter a whole number from 0 to 500';
  if ((f.latitude !== '' || f.longitude !== '') && (Math.abs(Number(f.latitude)) > 90 || Math.abs(Number(f.longitude)) > 180 || f.latitude === '' || f.longitude === '' || isNaN(Number(f.latitude)) || isNaN(Number(f.longitude))))
    e.latitude = 'Place the pin on the map, or clear it';
  if (f.allowedRadiusMeters !== '') {
    const r = Number(f.allowedRadiusMeters);
    if (!Number.isInteger(r) || r < 10 || r > 5000) e.allowedRadiusMeters = 'Use a whole number from 10 to 5000';
    else if (f.latitude === '') e.allowedRadiusMeters = 'A radius needs a pin on the map';
  }
  return e;
}

export default function InstitutionForm({ institution, meta, onClose, onSaved }) {
  const edit = !!institution;
  const mut = useInstitutionAction(edit ? 'update' : 'create');
  const init = institution ? Object.fromEntries(Object.keys(BLANK).map((k) => [k, institution[k] ?? ''])) : BLANK;
  const [f, setF] = useState(init);
  const [errs, setErrs] = useState({});
  const [suggested, setSuggested] = useState(null);

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errs[k]) setErrs({ ...errs, [k]: undefined }); };
  const patch = (o) => setF((cur) => ({ ...cur, ...o }));

  const submit = (e) => {
    e.preventDefault();
    const v = validate(f); setErrs(v);
    if (Object.keys(v).length) return;
    mut.mutate({ ...f, id: institution?.institutionId }, { onSuccess: onSaved, onError: (err) => setErrs(err.fields || {}) });
  };

  const text = (k, label, hint, props = {}) => (
    <Field label={label} error={errs[k]} hint={hint}><input className={`mt-1 ${inputCls}`} value={f[k]} onChange={set(k)} {...props} /></Field>
  );

  /** The map reports what is at the pin; the person decides whether to take it. */
  const onAddress = (r) => setSuggested(r);
  const takeSuggestion = () => {
    if (!suggested) return;
    patch({
      address: suggested.label.slice(0, 200),
      barangay: suggested.parts.barangay || f.barangay,
      municipality: suggested.parts.municipality || f.municipality,
      province: suggested.parts.province || f.province
    });
    setErrs((e) => ({ ...e, address: undefined }));
    setSuggested(null);
  };

  const pin = f.latitude !== '' && f.longitude !== '' ? { lat: Number(f.latitude), lng: Number(f.longitude) } : null;

  return (
    <Modal title={edit ? 'Edit institution' : 'Add institution'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {edit && <Field label="Institution ID"><input className={`mt-1 ${inputCls}`} value={institution.institutionId} disabled /></Field>}
          {text('institutionName', 'Institution name', null, { maxLength: 100 })}
          <Field label="Industry type" error={errs.industryType}>
            <select className={`mt-1 ${inputCls}`} value={f.industryType} onChange={set('industryType')}>
              <option value="">Select</option>{meta.industries.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          {text('contactPerson', 'Contact person', null, { maxLength: 80 })}
          {text('contactNumber', 'Contact number', null, { inputMode: 'tel' })}
          {text('email', 'Email', null, { type: 'email', maxLength: 100 })}
          <div className="sm:col-span-2">
            {text('address', 'Address', 'Used to place students near home when no pin is set', { maxLength: 200 })}
            {suggested && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded bg-forest-100/50 p-2.5 text-xs">
                <span className="min-w-0 flex-1">The map says this pin is at <span className="font-medium">{suggested.label}</span></span>
                <button type="button" onClick={takeSuggestion} className="shrink-0 font-semibold underline">Use as the address</button>
                <button type="button" onClick={() => setSuggested(null)} className="shrink-0 underline">Dismiss</button>
              </div>)}
          </div>
          {text('availableSlots', 'Available slots', 'Total students this institution can host', { inputMode: 'numeric' })}
        </div>

        <fieldset className="mt-5 rounded border border-forest-100 p-4">
          <legend className="px-1 text-sm font-bold">Location on the map (optional)</legend>
          <p className="mb-3 text-xs text-forest-700">
            Set this to turn on GPS-verified attendance here. Without it, scans at this institution are
            recorded as <span className="font-medium">NON_GPS_VERIFIED</span> &mdash; students can still time in
            and out, there is simply nothing to check them against.
          </p>
          {errs.latitude && <p role="alert" className="mb-2 text-sm text-red-700">{errs.latitude}</p>}
          {errs.allowedRadiusMeters && <p role="alert" className="mb-2 text-sm text-red-700">{errs.allowedRadiusMeters}</p>}
          <MapPicker
            label={f.institutionName || 'Institution'}
            value={pin}
            onChange={(pt) => { patch(pt ? { latitude: pt.lat, longitude: pt.lng } : { latitude: '', longitude: '', allowedRadiusMeters: '' }); setErrs((e) => ({ ...e, latitude: undefined })); }}
            onAddress={onAddress}
            radius={f.allowedRadiusMeters === '' ? null : f.allowedRadiusMeters}
            onRadiusChange={(v) => { patch({ allowedRadiusMeters: v }); setErrs((e) => ({ ...e, allowedRadiusMeters: undefined })); }}
          />
        </fieldset>

        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Saving...' : edit ? 'Save changes' : 'Create institution'}</button>
        </div>
      </form>
    </Modal>
  );
}
