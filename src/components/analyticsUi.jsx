export const pct = (v) => (v == null ? '-' : `${v}%`);
export const num = (v) => (v == null ? '-' : v);

export function StatsPanel({ title, items }) {
  return (
    <section className="rounded-lg border border-forest-100 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <dl className="divide-y divide-forest-100 text-sm">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-1.5"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
