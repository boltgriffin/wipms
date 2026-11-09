const TONE = {
  Active: 'bg-green-100 text-green-800', Completed: 'bg-blue-100 text-blue-800', Revoked: 'bg-red-100 text-red-800', Auto: 'bg-gray-100 text-gray-700', Manual: 'bg-amber-100 text-amber-800',
  Submitted: 'bg-amber-100 text-amber-800', Reviewed: 'bg-green-100 text-green-800', Dismissed: 'bg-gray-100 text-gray-700', Minor: 'bg-amber-100 text-amber-800', Major: 'bg-red-100 text-red-800',
  Resolved: 'bg-green-100 text-green-800', Observation: 'bg-blue-100 text-blue-800', Incident: 'bg-red-100 text-red-800', Merit: 'bg-green-100 text-green-800'
};
export const Pill = ({ text }) => <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONE[text] || 'bg-gray-100 text-gray-700'}`}>{text}</span>;
export const pc = (v) => (v == null ? '-' : `${v}%`);
export const day = (iso) => (iso ? String(iso).slice(0, 10) : '');
