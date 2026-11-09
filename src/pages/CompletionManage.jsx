import { useState } from 'react';
import StatCard from '../components/StatCard';
import { StudentReportModal } from '../components/ReportViews';
import { CompletionPill, CriteriaList, nz, pct } from '../components/CompletionUi';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import { DataTable, FilterBar, PageHeader, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useCompletionAction, useCompletionOverview } from '../hooks/useCompletion';
import { useAuthStore } from '../store/authStore';

function SettingsPanel({ s, admin }) {
  const save = useCompletionAction('/completion/settings');
  const [f, setF] = useState({ journalPct: s.journalPct, requireFinal: s.requireFinal });
  const [ok, setOk] = useState(false);
  return (
    <section className="mt-8 rounded-lg border border-forest-100 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold">Completion rules {admin ? '' : '(only an administrator can change these)'}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attended days that need an approved journal (%)" error={save.error?.fields?.journalPct}>
          <input type="number" disabled={!admin} value={f.journalPct} onChange={(e) => { setF({ ...f, journalPct: e.target.value }); setOk(false); }} className={`mt-1 ${inputCls}`} /></Field>
        <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" disabled={!admin} checked={f.requireFinal} onChange={(e) => { setF({ ...f, requireFinal: e.target.checked }); setOk(false); }} />Require a submitted Final evaluation (otherwise any submitted evaluation counts)</label>
      </div>
      {admin && <div className="mt-3 flex items-center gap-3"><button className={btnPrimary} disabled={save.isPending}
        onClick={() => save.mutate({ journalPct: Number(f.journalPct), requireFinal: f.requireFinal }, { onSuccess: () => setOk(true) })}>{save.isPending ? 'Saving...' : 'Save rules'}</button>
        {ok && <span role="status" className="text-sm text-green-800">Saved.</span>}</div>}
    </section>
  );
}

export default function CompletionManage() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const t = useTableState({ status: '', institutionId: '' }, { key: 'name', dir: 'asc' });
  const [dlg, setDlg] = useState(null);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const query = useCompletionOverview({ ...t.params, pageSize: 10 });
  const approve = useCompletionAction('/completion/approve');
  const revoke = useCompletionAction('/completion/revoke');
  const d = query.data;
  const close = () => { setDlg(null); setText(''); approve.reset(); revoke.reset(); };
  const act = dlg?.type === 'approve' ? approve : revoke;
  const go = () => act.mutate(dlg.type === 'approve' ? { studentId: dlg.s.studentId, remarks: text } : { studentId: dlg.s.studentId, reason: text },
    { onSuccess: () => { setNotice(dlg.type === 'approve' ? `${dlg.s.name}'s completion was approved.` : `Approval was withdrawn for ${dlg.s.name}.`); close(); } });

  const filters = [
    { key: 'status', label: 'Completion status', anyLabel: 'All statuses', options: ['Completed', 'Pending', 'Incomplete'].map((x) => ({ value: x, label: x })) },
    { key: 'institutionId', label: 'Institution', options: (d?.institutions || []).map((i) => ({ value: i.id, label: i.name })) }
  ];
  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (s) => s.name, render: (s) => <><span className="font-medium">{s.name}</span><span className="block text-xs text-forest-700">{s.className}</span></> },
    { key: 'institution', header: 'Institution', sortable: true, value: (s) => s.institutionName, render: (s) => nz(s.institutionName) },
    { key: 'hours', header: 'Hours', sortable: true, nowrap: true, value: (s) => `${s.hours.rendered}/${s.hours.required}`,
      render: (s) => <>{s.hours.rendered} / {s.hours.required}<span className="block text-xs text-forest-700">{pct(s.hours.pct)}</span></> },
    { key: 'journals', header: 'Journals approved', sortable: true, value: (s) => pct(s.journals.coveragePct),
      render: (s) => <>{s.journals.approvedDays} of {s.journals.attendedDays}<span className="block text-xs text-forest-700">{pct(s.journals.coveragePct)}</span></> },
    { key: 'rating', header: 'Evaluation', sortable: true, value: (s) => (s.rating.average ?? ''),
      render: (s) => (s.criteria[2].met ? <>Submitted<span className="block text-xs text-forest-700">{s.rating.average != null ? `${s.rating.average}/5 ${s.rating.label}` : ''}</span></> : 'Not yet') },
    { key: 'approval', header: 'Teacher approval', value: (s) => (s.approval ? s.approval.at.slice(0, 10) : ''),
      render: (s) => (s.approval ? <>Approved<span className="block text-xs text-forest-700">{s.approval.at.slice(0, 10)}</span></> : '-') },
    { key: 'status', header: 'Status', sortable: true, value: (s) => s.status, render: (s) => <CompletionPill status={s.status} /> }
  ];

  return (
    <>
      <PageHeader title="Completion" />
      {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={d?.counts.total} /><StatCard label="Completed" value={d?.counts.Completed} />
        <StatCard label="Pending approval" value={d?.counts.Pending} hint="Requirements met" /><StatCard label="Incomplete" value={d?.counts.Incomplete} />
      </div>
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('completion', columnsToCsv(columns), d?.items || [])} />
      <DataTable columns={columns} rows={d?.items} getRowId={(s) => s.studentId} loading={query.isLoading} error={query.error}
        sort={t.sort} onSort={t.onSort} caption="Completion status"
        empty={{ title: 'No students found', body: 'Nothing matches this search or filter.' }}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="student"
        rowActions={(s) => (<>
          <button className="font-semibold text-amber-600 underline" onClick={() => setDlg({ type: 'criteria', s })}>Criteria</button>
          <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => setDlg({ type: 'report', s })}>Report</button>
          {s.canApprove && <button className="ml-3 font-semibold text-green-700 underline" onClick={() => { setNotice(''); setDlg({ type: 'approve', s }); }}>Approve</button>}
          {s.canRevoke && <button className="ml-3 font-semibold text-red-700 underline" onClick={() => { setNotice(''); setDlg({ type: 'revoke', s }); }}>Withdraw</button>}
        </>)} />
      {d && <SettingsPanel key={JSON.stringify(d.settings)} s={d.settings} admin={admin} />}

      {dlg?.type === 'criteria' && <Modal title={`${dlg.s.name} - completion criteria`} onClose={close}><div className="mb-3"><CompletionPill status={dlg.s.status} /></div><CriteriaList criteria={dlg.s.criteria} /></Modal>}
      {dlg?.type === 'report' && <StudentReportModal studentId={dlg.s.studentId} onClose={close} />}
      {(dlg?.type === 'approve' || dlg?.type === 'revoke') && (
        <Modal title={dlg.type === 'approve' ? `Approve completion for ${dlg.s.name}?` : `Withdraw approval for ${dlg.s.name}?`} onClose={close}>
          <p className="text-sm">{dlg.type === 'approve' ? 'Hours, journals and the supervisor evaluation are complete. Your approval marks the student as Completed.' : 'The student goes back to Pending. Give a reason; it is saved in the record.'}</p>
          <div className="mt-3"><Field label={dlg.type === 'approve' ? 'Remarks (optional)' : 'Reason'} error={act.error?.fields?.reason || act.error?.fields?.remarks}>
            <textarea rows={3} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} className={`mt-1 ${inputCls}`} /></Field></div>
          <div className="mt-3"><ErrorBanner error={act.error && !act.error.fields ? act.error : null} /></div>
          <div className="mt-4 flex gap-3"><button className={`flex-1 ${btnGhost}`} onClick={close}>Cancel</button>
            <button className={`flex-1 ${btnPrimary}`} disabled={act.isPending} onClick={go}>{act.isPending ? 'Working...' : dlg.type === 'approve' ? 'Approve' : 'Withdraw'}</button></div>
        </Modal>)}
    </>
  );
}
