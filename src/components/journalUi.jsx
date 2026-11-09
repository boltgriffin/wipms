import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { journalService } from '../services/journalService';
import { useAuthStore } from '../store/authStore';
import { ErrorBanner, btnGhost } from './ui';

export const JOURNAL_STATUSES = ['Pending', 'Approved', 'Rejected', 'Revision Required'];
const TONE = { Pending: 'bg-amber-100 text-amber-800', Approved: 'bg-green-100 text-green-800', Rejected: 'bg-red-100 text-red-800', 'Revision Required': 'bg-blue-100 text-blue-800' };
export const JournalBadge = ({ status }) => <span className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONE[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
export const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '');

const toBlob = (b64, type) => {
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
};

// Loads the attachment on demand: files stay private and are only sent after the server checks who is asking
export function ProofViewer({ id, name }) {
  const [file, setFile] = useState(null);
  const load = useMutation({
    mutationFn: () => journalService.proof(useAuthStore.getState().token, id),
    onSuccess: (d) => setFile({ url: URL.createObjectURL(toBlob(d.data, d.mimeType)), mime: d.mimeType, name: d.fileName })
  });
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);
  if (!file) return (
    <div>
      <ErrorBanner error={load.error} />
      <button type="button" disabled={load.isPending} onClick={() => load.mutate()} className={btnGhost}>{load.isPending ? 'Loading...' : `View attachment (${name})`}</button>
    </div>
  );
  return (
    <div>
      {file.mime.startsWith('image/')
        ? <img src={file.url} alt="Proof attachment" className="max-h-96 rounded border border-forest-100" />
        : <iframe title="Proof attachment" src={file.url} className="h-96 w-full rounded border border-forest-100" />}
      <a href={file.url} download={file.name} className="mt-2 inline-block text-sm font-semibold text-amber-600 underline">Download {file.name}</a>
    </div>
  );
}

const Sec = ({ t, v }) => (
  <div><h4 className="text-xs font-bold uppercase tracking-wide text-forest-700">{t}</h4><p className="mt-1 whitespace-pre-wrap text-sm">{v || '-'}</p></div>
);
export function JournalBody({ j }) {
  return (
    <div className="space-y-4">
      <Sec t="Activities performed" v={j.activities} /><Sec t="Skills learned" v={j.skills} />
      <Sec t="Problems encountered" v={j.problems} /><Sec t="Reflection" v={j.reflection} />
      <div><h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-forest-700">Proof attachment</h4>
        {j.hasProof ? <ProofViewer id={j.id} name={j.proofName} /> : <p className="text-sm">No attachment.</p>}</div>
    </div>
  );
}
