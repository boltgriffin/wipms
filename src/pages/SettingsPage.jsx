import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { BrandLogo } from '../components/AppShell';
import { ErrorBanner, Field, inputCls } from '../components/ui';
import { PageHeader, btnGhost, btnPrimary } from '../components/datatable';
import { useBranding, useBrandingAction, logoDataUri } from '../hooks/useShell';
import { useDtrAction, useDtrSettings } from '../hooks/useDtr';

/**
 * The times that drive the Daily Time Record. The lunch window is what comes out of each day's hours,
 * and the official hours are printed on Civil Service Form No. 48 and decide the undertime, so a
 * change here reprices every day already recorded; the save says how many rows it rewrote.
 */
function DtrSettingsCard() {
  const { data, isLoading } = useDtrSettings();
  const save = useDtrAction('settings');
  const [f, setF] = useState(null);
  const [done, setDone] = useState('');
  useEffect(() => { if (data && !f) setF({ ...data }); }, [data]); // eslint-disable-line
  if (isLoading || !f) return null;
  const err = save.error?.fields || {};
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setDone(''); };
  const check = (k) => (e) => { setF({ ...f, [k]: e.target.checked }); setDone(''); };

  return (
    <section className="rounded-xl border border-forest-100 bg-white p-5 lg:col-span-3">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-forest-700">Daily time record</h2>
      <p className="mb-4 text-xs text-forest-700">Students only press Time In and Time Out; these settings turn those two stamps into a DTR.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Lunch starts" error={err.lunchStart} hint="Not counted as rendered time">
          <input type="time" value={f.lunchStart || ''} onChange={set('lunchStart')} className={`mt-1 ${inputCls}`} />
        </Field>
        <Field label="Lunch ends" error={err.lunchEnd}>
          <input type="time" value={f.lunchEnd || ''} onChange={set('lunchEnd')} className={`mt-1 ${inputCls}`} />
        </Field>
        <Field label="Official hours, regular days" error={err.officialRegular} hint="Printed on the form, e.g. 08:00-17:00">
          <input value={f.officialRegular || ''} onChange={set('officialRegular')} placeholder="08:00-17:00" className={`mt-1 ${inputCls}`} />
        </Field>
        <Field label="Official hours, Saturdays" error={err.officialSaturday} hint="Leave blank for no Saturday duty">
          <input value={f.officialSaturday || ''} onChange={set('officialSaturday')} placeholder="08:00-12:00" className={`mt-1 ${inputCls}`} />
        </Field>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.autoLock} onChange={check('autoLock')} />
          Close attendance and send the DTR for approval once the required hours are complete</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.leaderRecording} onChange={check('leaderRecording')} />
          Let the student leader record attendance for a classmate with no device</label>
      </div>
      <ErrorBanner error={save.error && !save.error.fields ? save.error : null} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={btnPrimary} disabled={save.isPending}
          onClick={() => save.mutate(f, { onSuccess: (r) => setDone(`Saved. ${r.recomputed} attendance row${r.recomputed === 1 ? '' : 's'} recalculated.`) })}>
          {save.isPending ? 'Saving...' : 'Save DTR settings'}
        </button>
        {done && <span role="status" className="text-sm text-green-800">{done}</span>}
      </div>
    </section>
  );
}

/** Shrinks an uploaded logo to 512px and keeps PNG transparency; JPGs come back as JPG. */
async function prepareLogo(file) {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error('The logo must be a PNG or JPG image');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  if (file.type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const mimeType = file.type;
  const data = canvas.toDataURL(mimeType, 0.9).split(',')[1];
  if (data.length * 0.75 > 400 * 1024) throw new Error('The image is too large even after shrinking. Try a smaller file.');
  return { mimeType, data };
}

function LogoCard({ which, title, hint, logo, branding }) {
  const mut = useBrandingAction('logo');
  const fileRef = useRef(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const src = logoDataUri(logo);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(''); setBusy(true);
    try { const prepared = await prepareLogo(f); mut.mutate({ which, ...prepared }, { onError: (x) => setErr(x.fields?.logo || x.message) }); }
    catch (x) { setErr(x.message); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <div className="rounded-xl border border-forest-100 bg-white p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="mb-4 text-xs text-forest-700">{hint}</p>
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-forest-100 bg-paper">
          {src ? <img src={src} alt={`${title} preview`} className="max-h-16 max-w-16 object-contain" />
            : which === 'school' ? <BrandLogo branding={branding} size={48} /> : <ImageIcon size={24} aria-hidden="true" className="text-forest-700" />}
        </div>
        <div className="min-w-0">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={pick} className="hidden" id={`logo-${which}`} />
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`logo-${which}`} className={`${btnGhost} inline-flex cursor-pointer items-center gap-2`}><Upload size={15} />{busy || mut.isPending ? 'Uploading...' : src ? 'Replace' : 'Upload'}</label>
            {src && <button className={btnGhost} onClick={() => mut.mutate({ which, remove: true })}>Remove</button>}
          </div>
          <p className="mt-2 text-xs text-forest-700">PNG or JPG, under 400 KB. Large images are shrunk to 512px before upload.</p>
          {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { branding, isLoading } = useBranding();
  const save = useBrandingAction('save');
  const [f, setF] = useState(null);
  const [ok, setOk] = useState(false);
  useEffect(() => { if (branding && !f) setF({ schoolName: branding.schoolName, abbreviation: branding.abbreviation, systemName: branding.systemName, divisionName: branding.divisionName }); }, [branding]); // eslint-disable-line
  const err = save.error?.fields || {};
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setOk(false); };
  const text = (k, label, hint, props = {}) => <Field label={label} error={err[k]} hint={hint}><input value={f[k] ?? ''} onChange={set(k)} className={`mt-1 ${inputCls}`} {...props} /></Field>;

  return (
    <>
      <PageHeader title="System settings" subtitle="Branding appears on the sign-in page, the sidebar, the mobile menu and every PDF report." />
      {isLoading && <p className="text-sm">Loading...</p>}
      {f && (
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-xl border border-forest-100 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-forest-700">Branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {text('schoolName', 'School name', 'For example: Baganga National High School', { maxLength: 120 })}
              {text('abbreviation', 'School abbreviation', 'Shown when no logo is uploaded', { maxLength: 16 })}
              <div className="sm:col-span-2">{text('systemName', 'System name', 'For example: Work Immersion Progress Monitoring System', { maxLength: 120 })}</div>
              <div className="sm:col-span-2">{text('divisionName', 'Division name', 'Optional. Printed in the footer and on reports.', { maxLength: 120 })}</div>
            </div>
            <ErrorBanner error={save.error && !save.error.fields ? save.error : null} />
            <div className="mt-4 flex items-center gap-3">
              <button className={btnPrimary} disabled={save.isPending} onClick={() => save.mutate(f, { onSuccess: () => setOk(true) })}>{save.isPending ? 'Saving...' : 'Save branding'}</button>
              {ok && <span role="status" className="text-sm text-green-800">Saved. The new name appears everywhere within a few minutes.</span>}
            </div>
          </section>

          <aside className="rounded-xl border border-forest-100 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">Preview</h2>
            <div className="rounded-lg bg-nav p-4">
              <div className="flex items-center gap-3">
                <BrandLogo branding={{ ...branding, ...f }} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{f.schoolName || 'School name'}</p>
                  <p className="truncate text-xs text-nav-soft">{f.systemName || 'System name'}</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-forest-700">This is how the sidebar header and the sign-in page will read.</p>
          </aside>

          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-3">
            <LogoCard which="school" title="School logo" hint="Used in the sidebar, the sign-in page and PDF report headers." logo={branding.schoolLogo} branding={{ ...branding, ...f }} />
            <LogoCard which="division" title="Division logo" hint="Optional. Printed beside the school logo on reports." logo={branding.divisionLogo} branding={{ ...branding, ...f }} />
          </div>

          <DtrSettingsCard />
        </div>)}
    </>
  );
}
