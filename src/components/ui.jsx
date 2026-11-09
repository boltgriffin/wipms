import { useEffect } from 'react';

export const inputCls = 'w-full rounded border border-forest-100 px-3 py-2 text-sm disabled:bg-gray-100';
export const btnPrimary = 'rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600 disabled:opacity-60';
export const btnGhost = 'rounded border border-forest-800 px-4 py-2 text-sm font-semibold disabled:opacity-60';

export function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`my-8 w-full rounded-lg bg-white p-5 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm font-medium">
      {label}{children}
      {hint && !error && <span className="mt-1 block text-xs font-normal text-forest-700">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-normal text-red-700">{error}</span>}
    </label>
  );
}
export const ErrorBanner = ({ error }) => error ? <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error.message || String(error)}</p> : null;
export function Pagination({ page, pages, total, onPage }) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span>{total} result{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-3">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border border-forest-100 px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded border border-forest-100 px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
export function ConfirmDialog({ title, text, confirmLabel = 'Confirm', busy, error, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm">{text}</p>
      <div className="mt-3"><ErrorBanner error={error} /></div>
      <div className="mt-4 flex gap-3">
        <button onClick={onCancel} className={`flex-1 ${btnGhost}`}>Cancel</button>
        <button disabled={busy} onClick={onConfirm} className={`flex-1 ${btnPrimary}`}>{busy ? 'Working...' : confirmLabel}</button>
      </div>
    </Modal>
  );
}
const TONE = { ACTIVE: 'bg-green-100 text-green-800', INACTIVE: 'bg-gray-100 text-gray-700', COMPLETED: 'bg-blue-100 text-blue-800', DROPPED: 'bg-red-100 text-red-800' };
export const StatusPill = ({ status }) => <span className={`rounded px-2 py-0.5 text-xs font-semibold ${TONE[status] || TONE.INACTIVE}`}>{status}</span>;
