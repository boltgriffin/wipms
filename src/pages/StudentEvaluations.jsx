import { EvaluationCard, EvaluationSummary, FeedbackList } from '../components/supervisorUi';
import { ErrorBanner } from '../components/ui';
import { useMyEvaluations } from '../hooks/useSupervisor';

export default function StudentEvaluations() {
  const { data: d, error, isLoading } = useMyEvaluations();
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">My evaluations</h1>
      <ErrorBanner error={error} />
      {isLoading && <p className="text-sm">Loading...</p>}
      {d && <>
        <EvaluationSummary s={d.summary} />
        <h2 className="mb-3 mt-8 text-lg font-bold">Evaluations from your supervisor</h2>
        <div className="space-y-4">{d.evaluations.map((e) => <EvaluationCard key={e.id} e={e} />)}</div>
        <h2 className="mb-3 mt-8 text-lg font-bold">Feedback</h2>
        <FeedbackList items={d.feedback} />
      </>}
    </>
  );
}
