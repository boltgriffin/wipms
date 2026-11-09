import { useState } from 'react';
import StatCard from '../components/StatCard';
import MiniMap from '../components/MiniMap';
import { ErrorBanner, Field, Modal, inputCls } from '../components/ui';
import { DataTable, FilterBar, PageHeader, btnGhost, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { MODE_LABEL, MODE_TONE, flagText } from '../components/geo';
import { useGpsAction, useGpsLogs, useGpsOverview, useGpsRecords } from '../hooks/useGps';
import { useAuthStore } from '../store/authStore';

const Mode = ({ mode }) => mode ? <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${MODE_TONE[mode] || 'bg-gray-100 text-gray-700'}`}>{MODE_LABEL[mode] || mode}</span> : <span className="text-xs text-forest-700">-</span>;
const d10 = (iso) => (iso ? String(iso).slice(0, 10) : '-');
const m = (v) => (v == null ? '-' : `${v} m`);

/* ---------- Institutions and captured locations ---------- */
function CoordsDialog({ inst, onClose }) {
  const save = useGpsAction('/gps/coords');
  const approve = useGpsAction('/gps/proposal');
  const p = inst.proposed;
  const [f, setF] = useState({ lat: inst.lat ?? p?.lat ?? '', lng: inst.lng ?? p?.lng ?? '', radius: inst.radius ?? '', minAccuracy: inst.minAccuracy ?? '', note: '' });
  const err = (save.error?.fields) || (approve.error?.fields) || {};
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const body = { institutionId: inst.institutionId, lat: Number(f.lat), lng: Number(f.lng), radius: f.radius === '' ? '' : Number(f.radius), minAccuracy: f.minAccuracy === '' ? '' : Number(f.minAccuracy), note: f.note };
  const points = [];
  if (f.lat !== '' && f.lng !== '') points.push({ lat: Number(f.lat), lng: Number(f.lng), label: 'Official location', color: '#1D4A41' });
  if (p && (Number(f.lat) !== p.lat || Number(f.lng) !== p.lng)) points.push({ lat: p.lat, lng: p.lng, label: `Captured from ${p.captures} scan(s)`, color: '#C8861D' });
  return (
    <Modal title={`GPS location - ${inst.name}`} onClose={onClose} wide>
      {p && (
        <div className="mb-4 rounded bg-blue-50 p-3 text-sm">
          <p><strong>Captured from students:</strong> {p.captures} scan(s) from {p.students} student(s), {d10(p.firstAt)} to {d10(p.lastAt)}. Readings spread over about {p.spread} m.</p>
          <p className="mt-1 text-xs">Drag the pin on the map, or edit the numbers, before approving.</p>
        </div>)}
      <div className="mb-4"><MiniMap height={260} points={points} draggable circle={f.lat !== '' && f.lng !== '' ? { lat: Number(f.lat), lng: Number(f.lng), radius: Number(f.radius) || 100 } : null}
        onMove={(pt) => setF({ ...f, lat: pt.lat, lng: pt.lng })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Latitude" error={err.lat}><input value={f.lat} onChange={set('lat')} inputMode="decimal" className={`mt-1 ${inputCls}`} /></Field>
        <Field label="Longitude" error={err.lat}><input value={f.lng} onChange={set('lng')} inputMode="decimal" className={`mt-1 ${inputCls}`} /></Field>
        <Field label="Radius (m)" error={err.radius} hint="Blank uses the global radius"><input value={f.radius} onChange={set('radius')} inputMode="numeric" className={`mt-1 ${inputCls}`} /></Field>
        <Field label="Minimum accuracy (m)" error={err.minAccuracy} hint="Blank uses the global setting"><input value={f.minAccuracy} onChange={set('minAccuracy')} inputMode="numeric" className={`mt-1 ${inputCls}`} /></Field>
      </div>
      <div className="mt-4"><Field label="Note (optional)" error={err.note}><input value={f.note} onChange={set('note')} maxLength={200} className={`mt-1 ${inputCls}`} /></Field></div>
      <p className="mt-2 text-xs text-forest-700">In Google Maps, right-click the spot and copy the two numbers it shows.</p>
      <div className="mt-3"><ErrorBanner error={(save.error && !save.error.fields ? save.error : null) || (approve.error && !approve.error.fields ? approve.error : null)} /></div>
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        {p && <button className={btnGhost} disabled={approve.isPending} onClick={() => approve.mutate({ institutionId: inst.institutionId, decision: 'reject', note: f.note || 'Captured location not accurate' }, { onSuccess: onClose })}>Reject captured</button>}
        {p && <button className={btnPrimary} disabled={approve.isPending} onClick={() => approve.mutate({ ...body, decision: 'approve' }, { onSuccess: onClose })}>{approve.isPending ? 'Approving...' : 'Approve as official location'}</button>}
        {!p && <button className={btnPrimary} disabled={save.isPending} onClick={() => save.mutate(body, { onSuccess: onClose })}>{save.isPending ? 'Saving...' : 'Save coordinates'}</button>}
      </div>
    </Modal>
  );
}

function InstitutionsTab({ list }) {
  const t = useTableState({ geotagged: '' });
  const [open, setOpen] = useState(null);
  const filters = [{ key: 'geotagged', label: 'GPS location', anyLabel: 'All institutions',
    options: [{ value: 'yes', label: 'Has coordinates' }, { value: 'no', label: 'No coordinates yet' }, { value: 'proposed', label: 'Waiting for approval' }] }];
  const rows = list.filter((i) => (!t.search || i.name.toLowerCase().includes(t.search.toLowerCase()))
    && (t.filters.geotagged !== 'yes' || i.geotagged) && (t.filters.geotagged !== 'no' || !i.geotagged) && (t.filters.geotagged !== 'proposed' || !!i.proposed));
  const columns = [
    { key: 'name', header: 'Institution', value: (i) => i.name, render: (i) => <><span className="font-medium">{i.name}</span><span className="block text-xs text-forest-700">{i.address}</span></> },
    { key: 'coords', header: 'GPS location', value: (i) => (i.geotagged ? `${i.lat}, ${i.lng}` : 'Not set'),
      render: (i) => (i.geotagged ? <span className="font-mono text-xs">{i.lat.toFixed(5)}, {i.lng.toFixed(5)}</span> : <span className="font-semibold text-amber-700">Not set</span>) },
    { key: 'radius', header: 'Radius', value: (i) => (i.radius ? `${i.radius} m` : 'Global'), render: (i) => (i.radius ? `${i.radius} m` : 'Global') },
    { key: 'students', header: 'Students', align: 'right', value: (i) => i.students, render: (i) => i.students },
    { key: 'proposed', header: 'Captured from students', value: (i) => (i.proposed ? i.proposed.captures : ''),
      render: (i) => (i.proposed ? <span className="font-semibold text-blue-800">{i.proposed.captures} scan(s) waiting</span> : '-') }
  ];
  return (
    <>
      <FilterBar searchPlaceholder="Search institutions..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('gps-institutions', columnsToCsv(columns), rows)} />
      <DataTable columns={columns} rows={rows} getRowId={(i) => i.institutionId} caption="Institution geotagging"
        empty={{ title: 'No institutions found', body: 'No institution matches this search or filter.' }}
        rowActions={(i) => <button className="font-semibold text-amber-600 underline" onClick={() => setOpen(i)}>{i.proposed ? 'Review' : i.geotagged ? 'Update' : 'Set location'}</button>} />
      {open && <CoordsDialog key={open.institutionId} inst={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------- Attendance records ---------- */
function RecordDialog({ r, onClose }) {
  const review = useGpsAction('/gps/review');
  const [note, setNote] = useState('');
  const points = [];
  if (r.inLat != null) points.push({ lat: r.inLat, lng: r.inLng, label: `Time in ${r.timeIn} (±${r.inAccuracy} m)`, color: '#2F855A' });
  if (r.outLat != null) points.push({ lat: r.outLat, lng: r.outLng, label: `Time out ${r.timeOut} (±${r.outAccuracy} m)`, color: '#C8861D' });
  const KV = ({ k, v }) => <div className="flex justify-between gap-4 py-1 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v}</dd></div>;
  return (
    <Modal title={`${r.studentName} - ${r.date}`} onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap items-center gap-2"><Mode mode={r.mode} />{r.confidence != null && <span className="text-sm font-bold">{r.confidence}/100 confidence</span>}
        <span className="text-xs text-forest-700">{r.source === 'OFFLINE' ? 'Saved offline' : 'Recorded live'}</span></div>
      <dl className="divide-y divide-forest-100 rounded border border-forest-100 p-3">
        <KV k="Institution" v={r.institutionName || '-'} /><KV k="Time in / out" v={`${r.timeIn || '-'} / ${r.timeOut || '-'}`} /><KV k="Hours" v={r.hours} />
        <KV k="Distance in / out" v={`${m(r.inDistance)} / ${m(r.outDistance)}`} /><KV k="Accuracy in / out" v={`${m(r.inAccuracy)} / ${m(r.outAccuracy)}`} />
      </dl>
      {r.flags.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-forest-700">{r.flags.map((f) => <li key={f}>{flagText(f)}</li>)}</ul>}
      {points.length > 0 && <div className="mt-4"><MiniMap height={260} points={points} /></div>}
      {(r.hasSelfieIn || r.hasSelfieOut) && <p className="mt-3 text-sm">A photo was attached to this record. Open the Attendance Selfies folder in Drive to view it.</p>}
      {r.reviewedAt
        ? <p className="mt-4 rounded bg-forest-100/60 p-3 text-sm"><strong>Reviewed</strong> by {r.reviewedBy} on {d10(r.reviewedAt)}{r.reviewNote ? `: ${r.reviewNote}` : ''}</p>
        : <div className="mt-4 rounded border border-forest-100 p-3">
            <Field label="Review note" error={review.error?.fields?.note} hint="Required to accept or reject (at least 5 characters)."><textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={`mt-1 ${inputCls}`} /></Field>
            <div className="mt-2"><ErrorBanner error={review.error && !review.error.fields ? review.error : null} /></div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, decision: 'accept', note }, { onSuccess: onClose })}>Accept as verified</button>
              <button className="rounded border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60" disabled={review.isPending} onClick={() => review.mutate({ id: r.id, decision: 'reject', note }, { onSuccess: onClose })}>Reject (mark absent, clear hours)</button>
            </div>
          </div>}
    </Modal>
  );
}

function RecordsTab({ institutions }) {
  const t = useTableState({ mode: 'FLAGGED', studentId: '', institutionId: '', from: '', to: '', unreviewed: '' }, { key: 'date', dir: 'desc' });
  const [open, setOpen] = useState(null);
  const q = useGpsRecords({ ...t.params, pageSize: 10 });
  const d = q.data;
  const filters = [
    { key: 'mode', label: 'GPS mode', anyLabel: 'All modes', options: [{ value: 'VERIFIED', label: 'Verified' }, { value: 'CAPTURED_ONLY', label: 'Location captured' }, { value: 'FLAGGED', label: 'Flagged' }] },
    { key: 'studentId', label: 'Student', options: (d?.students || []).map((s) => ({ value: s.id, label: s.name })) },
    { key: 'institutionId', label: 'Institution', options: institutions.map((i) => ({ value: i.institutionId, label: i.name })) },
    { key: 'unreviewed', label: 'Review state', anyLabel: 'Reviewed and not', options: [{ value: 'true', label: 'Not reviewed yet' }] },
    { key: 'from', label: 'From date', type: 'date' }, { key: 'to', label: 'To date', type: 'date' }
  ];
  const columns = [
    { key: 'date', header: 'Date', sortable: true, nowrap: true, value: (r) => r.date, render: (r) => r.date },
    { key: 'student', header: 'Student', sortable: true, value: (r) => r.studentName, render: (r) => <><span className="font-medium">{r.studentName}</span><span className="block text-xs text-forest-700">{r.institutionName}</span></> },
    { key: 'times', header: 'In / out', nowrap: true, value: (r) => `${r.timeIn || '-'} / ${r.timeOut || '-'}`, render: (r) => `${r.timeIn || '-'} / ${r.timeOut || '-'}` },
    { key: 'distance', header: 'Distance', sortable: true, value: (r) => r.inDistance, render: (r) => <>{m(r.inDistance)}{r.outDistance != null ? ` / ${m(r.outDistance)}` : ''}</> },
    { key: 'accuracy', header: 'Accuracy', sortable: true, value: (r) => r.inAccuracy, render: (r) => m(r.inAccuracy) },
    { key: 'mode', header: 'Mode', sortable: true, value: (r) => r.mode, render: (r) => <><Mode mode={r.mode} />{r.reviewedAt && <span className="block text-xs text-forest-700">reviewed</span>}</> },
    { key: 'confidence', header: 'Confidence', sortable: true, align: 'right', value: (r) => r.confidence, render: (r) => r.confidence ?? '-' }
  ];
  return (
    <>
      <FilterBar searchPlaceholder="Search attendance..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('gps-attendance', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} sort={t.sort} onSort={t.onSort} caption="GPS attendance verification"
        empty={{ title: 'No records found', body: 'Nothing matches this search or filter.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="record"
        rowActions={(r) => <button className="font-semibold text-amber-600 underline" onClick={() => setOpen(r)}>Open</button>} />
      {open && <RecordDialog r={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function LogsTab() {
  const t = useTableState({ result: '' });
  const q = useGpsLogs({ ...t.params, pageSize: 15 });
  const d = q.data;
  const filters = [{ key: 'result', label: 'Result', anyLabel: 'All attempts', options: [{ value: 'ACCEPTED', label: 'Accepted' }, { value: 'REJECTED', label: 'Rejected' }] }];
  const columns = [
    { key: 'at', header: 'When', nowrap: true, value: (l) => l.at, render: (l) => new Date(l.at).toLocaleString() },
    { key: 'student', header: 'Student', value: (l) => l.studentName, render: (l) => l.studentName },
    { key: 'action', header: 'Action', value: (l) => l.action, render: (l) => l.action },
    { key: 'result', header: 'Result', value: (l) => l.result, render: (l) => (l.result === 'ACCEPTED' ? <Mode mode={l.mode} /> : <span className="text-xs font-semibold text-red-700">Rejected</span>) },
    { key: 'distance', header: 'Distance', align: 'right', value: (l) => l.distance, render: (l) => m(l.distance) },
    { key: 'accuracy', header: 'Accuracy', align: 'right', value: (l) => l.accuracy, render: (l) => m(l.accuracy) },
    { key: 'notes', header: 'Notes', value: (l) => [l.reason, ...l.flags].filter(Boolean).join(', '),
      render: (l) => <span className="text-xs text-forest-700">{[l.reason, l.source === 'OFFLINE' ? 'offline' : '', ...l.flags.map(flagText)].filter(Boolean).join(', ')}</span> }
  ];
  return (
    <>
      <FilterBar searchPlaceholder="Search the log..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('gps-log', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} loading={q.isLoading} error={q.error} caption="GPS attempt log"
        empty={{ title: 'No GPS attempts logged yet', body: 'Every accepted and rejected scan is recorded here.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="attempt" />
    </>
  );
}

function SettingsTab({ s, admin }) {
  const save = useGpsAction('/gps/settings');
  const [f, setF] = useState({ ...s });
  const [ok, setOk] = useState(false);
  const err = save.error?.fields || {};
  const num = (k, label, hint) => <Field label={label} error={err[k]} hint={hint}><input type="number" disabled={!admin} value={f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setOk(false); }} className={`mt-1 ${inputCls}`} /></Field>;
  const flag = (k, label) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!admin} checked={!!f[k]} onChange={(e) => { setF({ ...f, [k]: e.target.checked }); setOk(false); }} />{label}</label>;
  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">GPS settings {admin ? '' : '(only an administrator can change these)'}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {num('globalRadius', 'Default radius (m)', 'Used when an institution has none of its own')}
        {num('minAccuracy', 'Minimum GPS accuracy (m)', 'A less precise reading is flagged')}
        {num('flagBelow', 'Flag below confidence', '0 to 100')}
        {num('offlineMaxHours', 'Accept offline scans up to (hours)')}
        {num('minCaptures', 'Captures before suggesting a location')}
        <Field label="Photo with each scan" error={err.selfieMode}>
          <select disabled={!admin} value={f.selfieMode} onChange={(e) => { setF({ ...f, selfieMode: e.target.value }); setOk(false); }} className={`mt-1 ${inputCls}`}>
            <option value="OFF">Off</option><option value="OPTIONAL">Optional</option><option value="REQUIRED">Required</option></select></Field>
      </div>
      <div className="mt-4 space-y-2">
        {flag('enabled', 'Attendance recording is on')}
        {flag('allowCaptured', 'Allow attendance at institutions that have no GPS location yet (recorded as "location captured")')}
        {flag('blockOutside', 'Refuse scans outside the radius instead of flagging them for review')}
      </div>
      <div className="mt-3"><ErrorBanner error={save.error && !save.error.fields ? save.error : null} /></div>
      {admin && <div className="mt-3 flex items-center gap-3">
        <button className={btnPrimary} disabled={save.isPending} onClick={() => save.mutate({ ...f, globalRadius: Number(f.globalRadius), minAccuracy: Number(f.minAccuracy), flagBelow: Number(f.flagBelow), offlineMaxHours: Number(f.offlineMaxHours), minCaptures: Number(f.minCaptures) }, { onSuccess: () => setOk(true) })}>{save.isPending ? 'Saving...' : 'Save settings'}</button>
        {ok && <span role="status" className="text-sm text-green-800">Saved.</span>}</div>}
    </section>
  );
}

export default function TeacherGps() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const { data: d, error, isLoading } = useGpsOverview();
  const [tab, setTab] = useState('institutions');
  const btn = (k, label) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-forest-800 text-white' : 'border border-forest-100 bg-white'}`}>{label}</button>;
  const c = d?.cards;
  return (
    <>
      <PageHeader title="GPS management" />
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Institutions" value={c?.institutions} /><StatCard label="With GPS location" value={c?.geotagged} />
        <StatCard label="Locations to approve" value={c?.awaitingApproval} /><StatCard label="Flagged days" value={c?.flaggedDays} /><StatCard label="Captured-only days" value={c?.capturedOnlyDays} />
      </div>
      <div role="tablist" className="mb-4 mt-6 flex flex-wrap gap-2">{btn('institutions', 'Institutions & geotagging')}{btn('records', 'Attendance verification')}{btn('logs', 'GPS log')}{btn('settings', 'Settings')}</div>
      {d && tab === 'institutions' && <InstitutionsTab list={d.institutions} />}
      {d && tab === 'records' && <RecordsTab institutions={d.institutions} />}
      {tab === 'logs' && <LogsTab />}
      {d && tab === 'settings' && <SettingsTab key={JSON.stringify(d.settings)} s={d.settings} admin={admin} />}
    </>
  );
}
