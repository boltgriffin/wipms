/**
 * Says plainly when the System Center has not been installed on the Apps Script side.
 *
 * Without this, the pages load, look completely normal, and then fail at the moment someone tries
 * to back up or reset — which is the worst possible time to discover a setup step was skipped.
 */
import { AlertTriangle, Info } from 'lucide-react';

export default function SystemReady({ ready }) {
  if (!ready) return null;

  if (!ready.ok) {
    return (
      <div role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
        <p className="flex items-start gap-2 font-semibold">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          This page will not work yet — the backend is missing {ready.missing.join(', ')}.
        </p>
        <p className="mt-2">{ready.fix}</p>
        <p className="mt-2 text-xs">
          Until that is done, creating a backup or running a reset will fail. Nothing will be deleted:
          a reset refuses to start unless it can take a backup first.
        </p>
      </div>);
  }

  if (ready.warnings && ready.warnings.length) {
    return (
      <p role="status" className="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{ready.warnings.join(' ')} Run <code>setupSystemCenter()</code> once in the Apps Script editor to install the
          two daily triggers. Everything else on this page works as normal.</span>
      </p>);
  }
  return null;
}
