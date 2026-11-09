import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FileText, Info, MapPin, RefreshCw, Users, WifiOff } from 'lucide-react';
import MiniMap from '../components/MiniMap';
import { Modal, btnGhost } from '../components/ui';
import { GEO_MESSAGES, flagText, getPosition, prepareSelfie } from '../components/geo';
import { OfflineStatus, PendingScans } from '../components/OfflineStatus';
import { newOfflineId, saveOffline } from '../offline/queue';
import { putInstitution } from '../offline/cache';
import { useGpsPermission, useOfflineSync } from '../hooks/useOffline';
import { AttendanceAction, HoursProgress, SourceTag, StateTag } from '../components/dtrUi';
import { useDtrToday } from '../hooks/useDtr';
import { gpsService } from '../services/gpsService';
import { useAuthStore } from '../store/authStore';

const RETRY = ['GPS_ACCURACY', 'GPS_STALE', 'NETWORK', 'BAD_GPS'];
const Row = ({ k, v }) => <div className="flex items-center justify-between gap-4 py-2 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;

/**
 * Milestone 10. A student does two things here: Time In, then Time Out. Everything else on the page is
 * read-only: where they are deployed, whether GPS could confirm it, the four DTR columns the system
 * generated from those two stamps, and how far along their required hours are.
 */
export default function StudentAttendance() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const studentId = useAuthStore((s) => s.user?.id);
  const { data: today, refetch, isLoading } = useDtrToday();
  const [phase, setPhase] = useState('idle'); // idle | locating | submitting
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [gps, setGps] = useState(null);
  const fileRef = useRef(null);

  const after = useCallback(() => {
    refetch();
    ['dtr', 'attendance', 'analytics', 'notifications'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  }, [refetch, qc]);

  // Connectivity, the queue, and sending it. Saved scans go up by themselves when the connection
  // returns or the student reopens the app; this page only shows what is happening and offers the
  // manual push.
  const { online, counts, syncing, message: syncMsg, setMessage: setSyncMsg, sync, refresh, retry } = useOfflineSync({ onSynced: after });
  const gpsPermission = useGpsPermission();

  // Keep the deployment on the device, so an offline launch can still name where the student is due.
  useEffect(() => { if (token && today?.workplace) putInstitution(token, today.workplace); }, [token, today?.workplace]);

  const run = async (confirm) => {
    setConfirming(false); setResult(null); setSyncMsg(''); setPhase('locating');
    let pos;
    try { pos = await getPosition(); } catch (e) { setPhase('idle'); setResult({ ok: false, text: GEO_MESSAGES[e.code] }); return; }
    const action = state === 'IN_PROGRESS' ? 'TIME_OUT' : 'TIME_IN';
    const payload = { ...pos, confirm, clientKey: newOfflineId(), userAgent: navigator.userAgent, selfie: selfie || undefined };
    if (!navigator.onLine) { // Level 2: hold it on the device with its real time and send it later
      const q = await saveOffline({ studentId, action, position: pos, confirm, selfie, userAgent: navigator.userAgent });
      setPhase('idle');
      if (q.ok) setSelfie(null);
      await refresh();
      setResult(q.ok
        ? { ok: true, text: `${action === 'TIME_OUT' ? 'Time out' : 'Time in'} saved on this device with its time and location. It is sent automatically when you are back online.` }
        : { ok: false, text: q.error });
      return;
    }
    setPhase('submitting');
    try {
      const d = await gpsService.scan(token, payload);
      setSelfie(null);
      if (fileRef.current) fileRef.current.value = '';
      setResult({
        ok: true, flags: d.flags, dtr: d.dtr,
        text: d.duplicate ? `This was already recorded at ${d.time}.`
          : d.action === 'TIME_IN'
            ? `Time In recorded at ${d.time}. Status: ${d.status}.`
            : `Time Out recorded at ${d.time}. Hours today: ${d.hours}.`
      });
    } catch (e) {
      if (e.code === 'NETWORK') {
        const q = await saveOffline({ studentId, action, position: pos, confirm, selfie, userAgent: navigator.userAgent });
        await refresh();
        setResult(q.ok ? { ok: true, text: 'The connection dropped, so this was saved on this device and will be sent automatically.' } : { ok: false, text: q.error });
      } else setResult({ ok: false, text: e.message, retry: RETRY.includes(e.code) });
    }
    setPhase('idle'); after();
  };

  const checkLocation = async () => {
    setGps(null); setPhase('locating');
    try { setGps(await gpsService.check(token, await getPosition())); } catch (e) { setGps({ error: GEO_MESSAGES[e.code] || e.message }); }
    setPhase('idle');
  };
  const pickSelfie = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return setSelfie(null);
    try { setSelfie(await prepareSelfie(f)); setResult(null); } catch (err) { setSelfie(null); setResult({ ok: false, text: err.message }); }
  };

  const state = today?.state || 'NOT_STARTED';
  const wp = today?.workplace;
  const blocked = !today || !today.enabled || !!today.problem || today.locked;
  const busy = phase !== 'idle';
  const busyLabel = phase === 'locating' ? 'Getting location...' : phase === 'submitting' ? 'Recording...' : '';
  const needSelfie = today?.selfieMode === 'REQUIRED' && !selfie;
  const press = () => { setResult(null); if (state === 'IN_PROGRESS') setConfirming(true); else run(false); };
  const points = wp?.lat != null ? [{ lat: wp.lat, lng: wp.lng, label: wp.name, color: '#0F766E' }] : [];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My attendance</h1>
          <p className="mt-1 text-sm text-forest-700">Press Time In when you arrive and Time Out when you leave. The rest of your daily time record is filled in for you.</p>
        </div>
        <Link to="/student/dtr" className={`${btnGhost} inline-flex items-center gap-2`}><FileText size={15} aria-hidden="true" />View my DTR</Link>
      </div>

      <div className="mb-4">
        <OfflineStatus online={online} gps={gpsPermission} counts={counts} syncing={syncing} />
      </div>

      {!online && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
          <WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          You are offline. You can still record attendance; it is saved on this device and sent when you reconnect.
        </p>)}
      {syncMsg && <p role="status" className="mb-4 rounded-lg bg-forest-100/60 p-3 text-sm">{syncMsg}</p>}

      <PendingScans counts={counts} online={online} syncing={syncing} onSync={() => sync(false)} onRetry={retry} onChanged={refresh} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---- Today, and the one button ---- */}
        <section className="rounded-xl border border-forest-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Today</h2>
            <StateTag state={state} />
          </div>
          {isLoading && <p className="text-sm text-forest-700">Loading...</p>}
          {today && (
            <dl className="divide-y divide-forest-100">
              <Row k="Date" v={today.date} />
              <Row k="Institution" v={wp ? wp.name : '—'} />
              <Row k="GPS status" v={wp ? (wp.geotagged ? `Set · ${wp.radius} m allowed` : 'Not set for this institution') : '—'} />
              <Row k="Attendance source" v={today.source ? <SourceTag source={today.source} /> : '—'} />
              <Row k="Time in" v={today.dtr?.amIn || today.dtr?.pmIn || '—'} />
              <Row k="Time out" v={today.dtr?.pmOut || today.dtr?.amOut || '—'} />
              <Row k="Hours today" v={state === 'COMPLETED' ? today.dtr.hours : '—'} />
              {today.recordedBy && <Row k="Recorded by" v={today.recordedBy} />}
            </dl>)}

          {today?.locked && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-violet-50 p-3 text-sm text-violet-900">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{today.lockMessage}
            </p>)}
          {today && !today.enabled && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm">Attendance recording is turned off right now.</p>}
          {today?.problem && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{today.problemMessage}</p>}
          {wp && !wp.geotagged && !today?.locked && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm">
              <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              Your institution has no GPS location, so there is nothing to check your position against. Your attendance is still recorded and your location is saved, so your teacher can set the official location from it.
            </p>)}

          {result && (
            <div role="alert" className={`mt-4 rounded-lg p-3 text-sm ${result.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
              <p>{result.text} {result.retry && <button onClick={() => run(state === 'IN_PROGRESS')} className="ml-1 font-semibold underline">Try again</button>}</p>
              {result.flags?.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{result.flags.map((f) => <li key={f}>{flagText(f)}</li>)}</ul>}
              {result.dtr && <p className="mt-2 font-semibold">Your required hours are complete. Your DTR has been generated and sent to your teacher for approval.</p>}
            </div>)}

          {today?.selfieMode && today.selfieMode !== 'OFF' && state !== 'COMPLETED' && !today.locked && (
            <label className="mt-4 block text-sm font-medium">Photo {today.selfieMode === 'REQUIRED' ? '(required)' : '(optional)'}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="user" onChange={pickSelfie} className="mt-1 block text-sm" />
              {selfie && <span className="mt-1 block text-xs text-green-800">Photo ready to send.</span>}
            </label>)}

          <div className="mt-5">
            <AttendanceAction state={state} busyLabel={busyLabel} disabled={blocked || needSelfie} onPress={press} />
            {needSelfie && state !== 'COMPLETED' && <p className="mt-2 text-center text-xs text-forest-700">Add the required photo first.</p>}
          </div>
          <button disabled={busy || !!today?.problem || !online} onClick={checkLocation} className={`${btnGhost} mt-3 inline-flex w-full items-center justify-center gap-2`}>
            <RefreshCw size={15} aria-hidden="true" />Check my location
          </button>
          <p className="mt-3 text-xs text-forest-700">Your location is read only when you record attendance, saved with that record, and seen only by authorized school staff.</p>
        </section>

        {/* ---- Progress and the generated DTR row ---- */}
        <div className="space-y-5">
          <section className="rounded-xl border border-forest-100 bg-white p-5">
            <h2 className="mb-4 text-lg font-bold">My progress</h2>
            <HoursProgress totals={today?.progress} />
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Rendered</dt><dd className="mt-1 text-lg font-bold">{today?.progress?.totalHours ?? 0} h</dd></div>
              <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Required</dt><dd className="mt-1 text-lg font-bold">{today?.progress?.requiredHours ?? 0} h</dd></div>
              <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Remaining</dt><dd className="mt-1 text-lg font-bold">{today?.progress?.remainingHours ?? 0} h</dd></div>
              <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Days rendered</dt><dd className="mt-1 text-lg font-bold">{today?.progress?.daysWorked ?? 0}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-forest-100 bg-white p-5">
            <h2 className="text-lg font-bold">Today&rsquo;s time record</h2>
            <p className="mb-4 mt-1 text-xs text-forest-700">Generated from your time in and time out. The lunch break is not counted.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['AM in', today?.dtr?.amIn], ['AM out', today?.dtr?.amOut], ['PM in', today?.dtr?.pmIn], ['PM out', today?.dtr?.pmOut]].map(([label, v]) => (
                <div key={label} className="rounded-lg border border-forest-100 p-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-forest-700">{label}</p>
                  <p className="mt-1 font-bold">{v || '—'}</p>
                </div>))}
            </div>
            {state === 'IN_PROGRESS' && (
              <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                The rest of the row is filled in once you time out. If you forget, ask for a correction from your DTR page.
              </p>)}
          </section>

          {wp?.geotagged && (
            <section className="rounded-xl border border-forest-100 bg-white p-5">
              <h2 className="mb-3 text-lg font-bold">Where you must be</h2>
              <MiniMap height={200} points={points} circle={{ lat: wp.lat, lng: wp.lng, radius: wp.radius }} />
              {gps && !gps.error && (
                <dl className="mt-3 divide-y divide-forest-100">
                  <Row k="Distance" v={gps.distance != null ? `${gps.distance} m (allowed ${gps.radius} m)` : 'Nothing to compare with'} />
                  <Row k="Accuracy" v={gps.accuracy != null ? `${gps.accuracy} m (need ${gps.minAccuracy} m or better)` : '—'} />
                </dl>)}
              {gps?.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{gps.error}</p>}
            </section>)}
        </div>
      </div>

      <p className="mt-6 flex items-start gap-2 text-xs text-forest-700">
        <Users size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        No phone with you? Your student leader can record your time in and time out for you. It is marked on your DTR as recorded by the leader.
      </p>

      {confirming && (
        <Modal title="Record Time Out?" onClose={() => setConfirming(false)}>
          <p className="text-sm">This closes your attendance for today. You cannot record again after this.</p>
          <div className="mt-5 flex gap-3">
            <button onClick={() => setConfirming(false)} className={`${btnGhost} flex-1`}>Cancel</button>
            <button onClick={() => run(true)} className="flex-1 rounded bg-amber-500 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600">Confirm Time Out</button>
          </div>
        </Modal>)}
    </>
  );
}
