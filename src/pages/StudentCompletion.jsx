import { useState } from 'react';
import { StudentReportModal } from '../components/ReportViews';
import { CompletionPill, CriteriaList, nz } from '../components/CompletionUi';
import { ErrorBanner, btnPrimary } from '../components/ui';
import { ProgressBar } from '../components/attendanceUi';
import { useMyCompletion } from '../hooks/useCompletion';

export default function StudentCompletion() {
  const { data: d, error, isLoading } = useMyCompletion();
  const [report, setReport] = useState(false);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">My completion</h1>{d && <button className={btnPrimary} onClick={() => setReport(true)}>View and export my report</button>}</div>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      {d && <>
        <div className="mb-4 flex items-center gap-3"><span className="text-sm font-semibold">Status</span><CompletionPill status={d.status} /></div>
        <p className="mb-4 text-sm text-forest-700">{d.status === 'Completed' ? 'Congratulations, your work immersion is complete.' : d.status === 'Pending' ? 'You have met the requirements. Your teacher still needs to approve your completion.' : 'Some requirements are not met yet. See what is missing below.'}</p>
        <CriteriaList criteria={d.criteria} />
        <div className="mt-6 rounded-lg border border-forest-100 bg-white p-5"><ProgressBar pct={d.hours.pct} label={`Hours: ${d.hours.rendered} of ${d.hours.required}`} /></div>
        {d.finalRating.average != null && <p className="mt-4 text-sm"><strong>Final rating:</strong> {d.finalRating.average} / 5 - {nz(d.finalRating.label)} ({d.finalRating.basis})</p>}
      </>}
      {report && <StudentReportModal studentId="" onClose={() => setReport(false)} />}
    </>
  );
}
