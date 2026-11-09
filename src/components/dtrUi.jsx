import { CheckCircle2, Clock, Lock, LogIn, LogOut, MapPin, PenLine, Satellite, UserCheck, WifiOff } from 'lucide-react';

/* ---------- Vocabulary shared by the student, leader and teacher screens ---------- */
export const SOURCE_META = {
  GPS_VERIFIED: { label: 'GPS verified', icon: Satellite, tone: 'bg-green-100 text-green-800', note: 'Checked against the institution’s coordinates' },
  NON_GPS_VERIFIED: { label: 'No GPS at site', icon: MapPin, tone: 'bg-blue-100 text-blue-800', note: 'The institution has no coordinates, so there was nothing to check against' },
  OFFLINE_SYNC: { label: 'Offline sync', icon: WifiOff, tone: 'bg-amber-100 text-amber-900', note: 'Saved on the phone with no signal and sent later' },
  LEADER_RECORDED: { label: 'Leader recorded', icon: UserCheck, tone: 'bg-violet-100 text-violet-800', note: 'Recorded by the student leader for a student with no device' },
  CORRECTION_APPROVED: { label: 'Corrected', icon: PenLine, tone: 'bg-cyan-100 text-cyan-900', note: 'The times on this day were changed by a teacher who approved a correction request' }
};
export const DTR_STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'bg-gray-100 text-gray-700' },
  PENDING_TEACHER_APPROVAL: { label: 'Pending teacher approval', tone: 'bg-amber-100 text-amber-900' },
  APPROVED: { label: 'Approved', tone: 'bg-green-100 text-green-800' }
};
export const STATE_META = {
  NOT_STARTED: { label: 'Not started', tone: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'In progress', tone: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completed', tone: 'bg-green-100 text-green-800' },
  LOCKED: { label: 'Closed', tone: 'bg-violet-100 text-violet-800' }
};
export const CORRECTION_META = {
  MISSING_TIME_OUT: 'Missing time out',
  GPS_ERROR: 'GPS error',
  CORRECTION: 'Attendance correction'
};
export const CORRECTION_STATUS_TONE = { Pending: 'bg-amber-100 text-amber-900', Approved: 'bg-green-100 text-green-800', Rejected: 'bg-red-100 text-red-700' };

const Chip = ({ tone, children, title }) => (
  <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>
);
export function SourceTag({ source }) {
  const m = SOURCE_META[source];
  if (!m) return <span className="text-xs text-forest-700">&mdash;</span>;
  const Icon = m.icon;
  return <Chip tone={m.tone} title={m.note}><Icon size={12} aria-hidden="true" />{m.label}</Chip>;
}
export const StatusTag = ({ status }) => {
  const m = DTR_STATUS_META[status] || { label: status || '—', tone: 'bg-gray-100 text-gray-700' };
  return <Chip tone={m.tone}>{m.label}</Chip>;
};
export const StateTag = ({ state }) => {
  const m = STATE_META[state] || { label: state || '—', tone: 'bg-gray-100 text-gray-700' };
  return <Chip tone={m.tone}>{m.label}</Chip>;
};
export const CorrectionTag = ({ status }) => <Chip tone={CORRECTION_STATUS_TONE[status] || 'bg-gray-100 text-gray-700'}>{status}</Chip>;

/* ---------- Progress ---------- */
export function ProgressBar({ pct, label, tone = 'bg-brand' }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Hours completed'}>
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${v}%` }} />
      </div>
      {label && <p className="mt-1.5 text-xs text-forest-700">{label}</p>}
    </div>
  );
}
export function HoursProgress({ totals }) {
  const t = totals || {};
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="text-2xl font-bold leading-none">{t.totalHours ?? 0}<span className="text-base font-medium text-forest-700"> / {t.requiredHours ?? 0} hours</span></p>
        <p className="text-sm font-semibold">{t.completionPct ?? 0}%</p>
      </div>
      <ProgressBar pct={t.completionPct} label={`${t.remainingHours ?? 0} hours remaining · ${t.daysWorked ?? t.daysCount ?? 0} day${(t.daysWorked ?? t.daysCount) === 1 ? '' : 's'} rendered`} />
    </div>
  );
}

/* ---------- The single attendance button ---------- */
/**
 * Exactly one action is ever offered: Time In when the day has not started, Time Out when it has, and
 * nothing at all once the day is complete or the DTR has been handed to the teacher.
 */
export function AttendanceAction({ state, busyLabel, onPress, disabled, className = '' }) {
  if (state === 'COMPLETED') {
    return (
      <p className={`flex items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-semibold text-green-800 ${className}`}>
        <CheckCircle2 size={18} aria-hidden="true" />Attendance complete for today
      </p>
    );
  }
  if (state === 'LOCKED') {
    return (
      <p className={`flex items-center justify-center gap-2 rounded-lg bg-violet-50 py-3 text-sm font-semibold text-violet-800 ${className}`}>
        <Lock size={18} aria-hidden="true" />Attendance closed
      </p>
    );
  }
  const timeIn = state === 'NOT_STARTED';
  const Icon = busyLabel ? Clock : timeIn ? LogIn : LogOut;
  return (
    <button type="button" onClick={onPress} disabled={disabled || !!busyLabel}
      className={`flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-base font-bold disabled:opacity-50 ${timeIn ? 'bg-amber-500 text-forest-900 hover:bg-amber-600' : 'bg-forest-800 text-white hover:bg-forest-900'} ${className}`}>
      <Icon size={19} aria-hidden="true" />{busyLabel || (timeIn ? 'Time In' : 'Time Out')}
    </button>
  );
}

/* ---------- The DTR table ---------- */
const Head = ({ children, className = '' }) => <th scope="col" className={`whitespace-nowrap px-3 py-2 text-left font-semibold ${className}`}>{children}</th>;

/**
 * The daily time record itself. Four generated columns per day plus the hours. Below 768px each day
 * becomes a card, because eight columns cannot be read on a phone.
 */
export function DtrTable({ days = [], showSource = true, emptyText = 'No attendance has been recorded yet.' }) {
  if (!days.length) return <p className="rounded-lg border border-dashed border-forest-100 p-6 text-center text-sm text-forest-700">{emptyText}</p>;
  const dash = (v) => v || '—';
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-forest-100 md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wide text-forest-700">
            <tr>
              <Head>Date</Head>
              <Head className="border-l border-forest-100">AM in</Head><Head>AM out</Head>
              <Head className="border-l border-forest-100">PM in</Head><Head>PM out</Head>
              <Head className="border-l border-forest-100 text-right">Hours</Head>
              <Head>Status</Head>
              {showSource && <Head>Source</Head>}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100">
            {days.map((d) => (
              <tr key={d.attendanceId || d.date} className={d.state === 'IN_PROGRESS' ? 'bg-amber-50/60' : ''}>
                <td className="whitespace-nowrap px-3 py-2 font-medium">{d.date}</td>
                <td className="whitespace-nowrap border-l border-forest-100 px-3 py-2">{dash(d.amIn)}</td>
                <td className="whitespace-nowrap px-3 py-2">{dash(d.amOut)}</td>
                <td className="whitespace-nowrap border-l border-forest-100 px-3 py-2">{dash(d.pmIn)}</td>
                <td className="whitespace-nowrap px-3 py-2">{dash(d.pmOut)}</td>
                <td className="whitespace-nowrap border-l border-forest-100 px-3 py-2 text-right font-semibold">{d.hours}</td>
                <td className="whitespace-nowrap px-3 py-2">{d.state === 'IN_PROGRESS' ? <span className="text-xs font-semibold text-amber-700">No time out</span> : d.status}</td>
                {showSource && <td className="px-3 py-2"><SourceTag source={d.source} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {days.map((d) => (
          <li key={d.attendanceId || d.date} className="rounded-lg border border-forest-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{d.date}</p>
                <p className="text-xs text-forest-700">{d.state === 'IN_PROGRESS' ? 'No time out recorded' : d.status}</p>
              </div>
              <p className="text-lg font-bold">{d.hours}<span className="text-xs font-medium text-forest-700"> hrs</span></p>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-forest-700">AM in</dt><dd>{dash(d.amIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-forest-700">AM out</dt><dd>{dash(d.amOut)}</dd></div>
              <div className="flex justify-between"><dt className="text-forest-700">PM in</dt><dd>{dash(d.pmIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-forest-700">PM out</dt><dd>{dash(d.pmOut)}</dd></div>
            </dl>
            {showSource && <p className="mt-3"><SourceTag source={d.source} /></p>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** The three or four sources actually present, explained once under a DTR. */
export function SourceLegend({ days = [] }) {
  const used = [];
  days.forEach((d) => { if (d.source && used.indexOf(d.source) < 0) used.push(d.source); });
  if (used.length < 2) return null;
  return (
    <dl className="mt-3 space-y-1.5 text-xs text-forest-700">
      {used.map((s) => (
        <div key={s} className="flex flex-wrap items-center gap-2">
          <dt><SourceTag source={s} /></dt><dd>{SOURCE_META[s]?.note}</dd>
        </div>
      ))}
    </dl>
  );
}
