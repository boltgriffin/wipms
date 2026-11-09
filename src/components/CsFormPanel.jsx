import { useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { ErrorBanner, btnGhost, btnPrimary, inputCls } from './ui';
import { SourceTag } from './dtrUi';
import { useCsForm } from '../hooks/useDtr';
import { useBranding } from '../hooks/useShell';
import { exportCsForm48, printCsForm48 } from '../export/csForm48';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ut = (d) => (d.undertimeHours === '' && d.undertimeMinutes === '' ? '' : `${d.undertimeHours || 0}h ${d.undertimeMinutes || 0}m`);

/**
 * Civil Service Form No. 48, one month at a time: the school's actual DTR. The screen mirrors the
 * paper form rather than the system's own day list, so what a teacher checks here is what prints.
 * `studentId` is passed by the teacher's review panel and left out for a student viewing their own.
 */
export default function CsFormPanel({ studentId, canPrint }) {
  const [month, setMonth] = useState('');
  const { data, isLoading, error } = useCsForm(month, studentId);
  const { branding } = useBranding();
  const [busy, setBusy] = useState('');

  if (isLoading && !data) return <p className="text-sm text-forest-700">Loading the monthly record...</p>;
  if (error) return <ErrorBanner error={error} />;
  if (!data) return null;

  const months = data.months || [];
  const t = data.totals || {};
  const act = async (kind) => {
    setBusy(kind);
    try { await (kind === 'print' ? printCsForm48(data, branding) : exportCsForm48(data, branding)); } finally { setBusy(''); }
  };

  return (
    <section className="rounded-xl border border-forest-100 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><FileSpreadsheet size={18} aria-hidden="true" />Daily Time Record</h2>
          <p className="mt-0.5 text-xs text-forest-700">Civil Service Form No. 48 &middot; prints two copies on one sheet</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="dtr-month">Month</label>
          <select id="dtr-month" value={month || data.month} onChange={(e) => setMonth(e.target.value)} className={`${inputCls} w-auto`}>
            {!months.some((m) => m.month === data.month) && <option value={data.month}>{data.label}</option>}
            {months.map((m) => <option key={m.month} value={m.month}>{m.label} ({m.days} day{m.days === 1 ? '' : 's'})</option>)}
          </select>
          <button disabled={!!busy} onClick={() => act('download')} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Download size={15} aria-hidden="true" />{busy === 'download' ? 'Preparing...' : 'Download'}
          </button>
          {canPrint && (
            <button disabled={!!busy} onClick={() => act('print')} className={`${btnGhost} inline-flex items-center gap-2`}>
              <Printer size={15} aria-hidden="true" />Print
            </button>)}
        </div>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Official hours</dt><dd className="mt-0.5 font-semibold">{data.official?.regularLabel || '—'}</dd></div>
        <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Saturdays</dt><dd className="mt-0.5 font-semibold">{data.official?.saturdayLabel || 'No duty'}</dd></div>
        <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Hours this month</dt><dd className="mt-0.5 font-semibold">{t.hours ?? 0} h &middot; {t.daysWorked ?? 0} days</dd></div>
        <div className="rounded-lg bg-paper p-3"><dt className="text-xs text-forest-700">Total undertime</dt><dd className="mt-0.5 font-semibold">{t.undertimeHours ?? 0}h {t.undertimeMinutes ?? 0}m</dd></div>
      </dl>

      {/* The grid, laid out as the form is: every day of the month, blank where nothing was recorded. */}
      <div className="overflow-x-auto rounded-lg border border-forest-100">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{data.label} daily time record for {data.student?.name}</caption>
          <thead className="bg-paper text-xs uppercase tracking-wide text-forest-700">
            <tr>
              <th scope="col" rowSpan={2} className="border-r border-forest-100 px-2 py-1.5 text-left font-semibold">Day</th>
              <th scope="colgroup" colSpan={2} className="border-r border-forest-100 px-2 py-1 text-center font-semibold">A.M.</th>
              <th scope="colgroup" colSpan={2} className="border-r border-forest-100 px-2 py-1 text-center font-semibold">P.M.</th>
              <th scope="col" rowSpan={2} className="px-2 py-1.5 text-right font-semibold">Undertime</th>
            </tr>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium">Arrival</th>
              <th scope="col" className="border-r border-forest-100 px-2 py-1 text-left font-medium">Departure</th>
              <th scope="col" className="px-2 py-1 text-left font-medium">Arrival</th>
              <th scope="col" className="border-r border-forest-100 px-2 py-1 text-left font-medium">Departure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest-100">
            {(data.days || []).map((d) => {
              const weekend = d.weekday === 0 || d.weekday === 6;
              return (
                <tr key={d.day} className={d.incomplete ? 'bg-amber-50/70' : weekend && !d.amIn && !d.pmIn ? 'bg-paper/60' : ''}>
                  <th scope="row" className="whitespace-nowrap border-r border-forest-100 px-2 py-1 text-left font-semibold">
                    {d.day}<span className="ml-1.5 text-xs font-normal text-forest-700">{DOW[d.weekday]}</span>
                  </th>
                  <td className="whitespace-nowrap px-2 py-1">{d.amIn || ''}</td>
                  <td className="whitespace-nowrap border-r border-forest-100 px-2 py-1">{d.amOut || ''}</td>
                  <td className="whitespace-nowrap px-2 py-1">{d.pmIn || ''}</td>
                  <td className="whitespace-nowrap border-r border-forest-100 px-2 py-1">
                    {d.pmOut || (d.incomplete ? <span className="text-xs font-semibold text-amber-700">no time out</span> : '')}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-right">{ut(d)}</td>
                </tr>);
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-forest-100 bg-paper font-bold">
              <td colSpan={5} className="px-2 py-1.5 text-right">Total</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right">{t.undertimeHours ?? 0}h {t.undertimeMinutes ?? 0}m</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-forest-700">
        Undertime is time owed against the official hours: arriving late and leaving early both count, and
        a half day missed after turning up counts in full. A day with no record at all stays blank, as on the paper form.
        {data.official_copy
          ? ` Approved${data.approvedBy ? ` by ${data.approvedBy}` : ''}, so this prints as the official copy.`
          : ' Until a teacher approves the record, every copy prints marked DRAFT.'}
      </p>
      {(data.days || []).some((d) => d.source === 'LEADER_RECORDED') && (
        <p className="mt-2 flex items-center gap-2 text-xs text-forest-700"><SourceTag source="LEADER_RECORDED" /> Some days this month were recorded by the student leader.</p>)}
    </section>
  );
}
