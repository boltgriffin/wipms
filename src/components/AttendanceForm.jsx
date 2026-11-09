import { useState } from 'react';
import { useAttendanceStore } from '../store/attendanceStore';
import { STATUSES } from './attendanceUi';

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export default function AttendanceForm() {
  const submit = useAttendanceStore((s) => s.submit);
  const [f, setF] = useState({ date: today(), status: 'Present', timeIn: '', timeOut: '', remarks: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const absent = f.status === 'Absent';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const mins = !absent && f.timeIn && f.timeOut ? toMin(f.timeOut) - toMin(f.timeIn) : null;
  const preview = mins > 0 ? (mins / 60).toFixed(2) : null;

  const onSubmit = async (e) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      await submit(f);
      setMsg({ ok: true, text: 'Attendance saved.' });
      setF({ ...f, timeIn: '', timeOut: '', remarks: '' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  };
  const input = 'w-full rounded border border-forest-100 px-3 py-2 disabled:bg-gray-100';
  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-forest-100 bg-white p-5">
      <h2 className="mb-4 text-lg font-bold">Log attendance</h2>
      {msg && <p role="alert" className={`mb-4 rounded p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Date<input type="date" required max={today()} value={f.date} onChange={set('date')} className={input} /></label>
        <label className="text-sm font-medium">Status
          <select value={f.status} onChange={set('status')} className={input}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-sm font-medium">Time in<input type="time" required={!absent} disabled={absent} value={f.timeIn} onChange={set('timeIn')} className={input} /></label>
        <label className="text-sm font-medium">Time out<input type="time" required={!absent} disabled={absent} value={f.timeOut} onChange={set('timeOut')} className={input} /></label>
      </div>
      <label className="mt-4 block text-sm font-medium">Remarks
        <textarea maxLength={200} rows={2} value={f.remarks} onChange={set('remarks')} className={input} /></label>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-forest-700">{absent ? 'Absent days count 0 hours.' : preview ? `Hours for this day: ${preview}` : mins <= 0 && mins !== null ? 'Time out must be after time in.' : ''}</p>
        <button disabled={busy} className="rounded bg-amber-500 px-5 py-2 font-semibold text-forest-900 hover:bg-amber-600 disabled:opacity-60">{busy ? 'Saving...' : 'Save attendance'}</button>
      </div>
    </form>
  );
}
