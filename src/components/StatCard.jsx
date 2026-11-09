export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-forest-100 bg-white p-5">
      <p className="text-sm font-medium text-forest-700">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value ?? '-'}</p>
      {hint && <p className="mt-1 text-xs text-forest-700/70">{hint}</p>}
    </div>
  );
}
