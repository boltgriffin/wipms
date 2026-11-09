import { useState } from 'react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui';
import { JournalBadge, JournalBody, fmt } from './journalUi';
import { useJournal, useReviewJournal } from '../hooks/useJournals';

const ACTION = { SUBMITTED: 'Submitted', RESUBMITTED: 'Resubmitted', APPROVED: 'Approved', REJECTED: 'Rejected', REVISION_REQUESTED: 'Returned for revision' };

// One panel for both roles: the server says whether this user can review (teacher, Pending) or edit (student, Revision Required)
export default function JournalPanel({ id, onClose, onEdit }) {
  const { data, isLoading, error } = useJournal(id);
  const review = useReviewJournal();
  const [remarks, setRemarks] = useState('');
  const [fieldErr, setFieldErr] = useState(null);
  const j = data?.journal;

  const decide = (decision) => {
    setFieldErr(null);
    if (decision !== 'approve' && remarks.trim().length < 5) return setFieldErr('Write at least 5 characters explaining this decision.');
    review.mutate({ id, decision, remarks }, { onSuccess: onClose, onError: (e) => setFieldErr(e.fields?.remarks || null) });
  };
  return (
    <Modal title="Journal" onClose={onClose} wide>
      {isLoading && <p className="text-sm">Loading...</p>}
      <ErrorBanner error={error} />
      {j && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-lg font-bold">{j.studentName}</p><p className="text-sm text-forest-700">Journal date: {j.date}{j.revisionCount ? ` - revised ${j.revisionCount}x` : ''}</p></div>
            <JournalBadge status={j.status} />
          </div>
          {j.remarks && (j.status === 'Rejected' || j.status === 'Revision Required' || j.status === 'Approved') && (
            <p className="mb-4 rounded bg-forest-100/60 p-3 text-sm"><strong>Teacher remarks{j.reviewerName ? ` (${j.reviewerName})` : ''}:</strong> {j.remarks}</p>)}
          <JournalBody j={j} />

          <h3 className="mb-2 mt-6 text-sm font-bold">History</h3>
          <ol className="space-y-1 text-sm">
            {data.history.map((h, i) => (
              <li key={i} className="border-l-2 border-forest-100 pl-3">
                <span className="font-semibold">{ACTION[h.action] || h.action}</span> by {h.actorName || 'unknown'} <span className="text-forest-700">- {fmt(h.at)}</span>
                {h.remarks && <span className="block text-forest-700">"{h.remarks}"</span>}
              </li>))}
          </ol>

          {data.canEdit && onEdit && (
            <div className="mt-6 flex justify-end"><button className={btnPrimary} onClick={() => onEdit(j)}>Edit and resubmit</button></div>)}

          {data.canReview && (
            <div className="mt-6 rounded border border-forest-100 p-4">
              <h3 className="mb-3 text-sm font-bold">Review this journal</h3>
              <Field label="Remarks" error={fieldErr} hint="Required to reject or return for revision (min 5 characters). Optional for approval.">
                <textarea rows={3} maxLength={500} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={`mt-1 ${inputCls}`} />
              </Field>
              <div className="mt-3"><ErrorBanner error={review.error && !review.error.fields ? review.error : null} /></div>
              <div className="flex flex-wrap gap-3">
                <button disabled={review.isPending} onClick={() => decide('approve')} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">Approve</button>
                <button disabled={review.isPending} onClick={() => decide('revise')} className={btnGhost}>Return for revision</button>
                <button disabled={review.isPending} onClick={() => decide('reject')} className="rounded border border-red-700 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60">Reject</button>
              </div>
            </div>)}
        </>
      )}
    </Modal>
  );
}
