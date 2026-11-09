import { useState } from 'react';
import { ExportButtons, InstitutionReportView, StudentReportView, TeacherReportView } from '../components/ReportViews';
import { ErrorBanner, Field, btnPrimary, inputCls } from '../components/ui';
import { useReport, useReportMeta } from '../hooks/useCompletion';
import { useAuthStore } from '../store/authStore';

const KINDS = [['student', 'Student completion'], ['institution', 'Institution summary'], ['teacher', 'Teacher summary']];

export default function CompletionReports() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const { data: meta, error: metaError } = useReportMeta();
  const [kind, setKind] = useState('student');
  const [pick, setPick] = useState('');
  const [params, setParams] = useState(null);
  const q = useReport(kind, params);
  const field = { student: 'studentId', institution: 'institutionId', teacher: 'teacherId' }[kind];
  const options = kind === 'student' ? meta?.students : kind === 'institution' ? meta?.institutions : meta?.teachers;
  const switchKind = (k) => { setKind(k); setPick(''); setParams(null); };
  const r = q.data?.report;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Completion reports</h1>
      <ErrorBanner error={metaError} />
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">
        {KINDS.map(([k, label]) => <button key={k} role="tab" aria-selected={kind === k} onClick={() => switchKind(k)} className={`rounded px-4 py-2 text-sm font-semibold ${kind === k ? 'bg-forest-800 text-white' : 'border border-forest-100 bg-white'}`}>{label}</button>)}
      </div>
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-forest-100 bg-white p-4" onSubmit={(e) => { e.preventDefault(); setParams({ [field]: pick }); }}>
        {(kind !== 'teacher' || admin) && (
          <Field label={kind === 'student' ? 'Student' : kind === 'institution' ? 'Institution' : 'Teacher'}>
            <select value={pick} onChange={(e) => { setPick(e.target.value); setParams(null); }} className={`mt-1 block min-w-60 ${inputCls}`}>
              <option value="">{kind === 'teacher' ? 'All teachers' : 'Select'}</option>{options?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select></Field>)}
        <button disabled={(kind !== 'teacher' && !pick) || q.isFetching} className={btnPrimary}>{q.isFetching ? 'Building...' : 'Generate report'}</button>
        {kind === 'teacher' && !admin && <p className="text-sm text-forest-700">Summary of your own students.</p>}
      </form>
      <ErrorBanner error={q.error} />
      {r && (
        <div className="rounded-lg border border-forest-100 bg-white p-5">
          <div className="mb-4"><ExportButtons kind={kind} report={r} /></div>
          {kind === 'student' && <StudentReportView r={r} />}{kind === 'institution' && <InstitutionReportView r={r} />}{kind === 'teacher' && <TeacherReportView r={r} />}
        </div>)}
    </>
  );
}
