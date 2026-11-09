import { useState } from 'react';
import { Archive, CalendarClock, Camera, Database, Download, ExternalLink, HardDrive, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { DataTable, FilterBar, PageHeader, useTableState } from '../components/datatable';
import { ConfirmDialog, ErrorBanner, Modal, btnGhost, btnPrimary, inputCls } from '../components/ui';
import DangerDialog from '../components/DangerDialog';
import SystemReady from '../components/SystemReady';
import { useBackupAction, useBackups } from '../hooks/useSystem';
import { saveBase64, systemService } from '../services/systemService';
import { useAuthStore } from '../store/authStore';

const KB = 1024;
function fileSize(n) {
  if (!n) return '—';
  if (n < KB) return n + ' B';
  if (n < KB * KB) return (n / KB).toFixed(0) + ' KB';
  return (n / KB / KB).toFixed(1) + ' MB';
}
const when = (iso) => { const d = new Date(iso); return isNaN(d) ? String(iso || '') : d.toLocaleString(); };

const TYPE_META = {
  SNAPSHOT: { label: 'Snapshot', icon: Camera, tone: 'bg-blue-100 text-blue-800', note: 'A copy of the whole spreadsheet in Drive' },
  FULL: { label: 'Full', icon: Database, tone: 'bg-green-100 text-green-800', note: 'Every module, as JSON' },
  MODULE: { label: 'Modules', icon: Archive, tone: 'bg-violet-100 text-violet-800', note: 'Only the modules chosen' }
};

/* ---------- Create ---------- */

function CreateBackup({ modules, onClose }) {
  const mut = useBackupAction('create');
  const [type, setType] = useState('SNAPSHOT');
  const [format, setFormat] = useState('ZIP');
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');

  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const Choice = ({ value, title, body }) => (
    <label className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${type === value ? 'border-amber-500 bg-amber-50/60' : 'border-forest-100'}`}>
      <input type="radio" name="bktype" className="mt-1" checked={type === value} onChange={() => setType(value)} />
      <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-forest-700">{body}</span></span>
    </label>
  );

  return (
    <Modal title="Create a backup" onClose={onClose} wide>
      <ErrorBanner error={mut.error} />
      <div className="space-y-2">
        <Choice value="SNAPSHOT" title="Snapshot of the whole spreadsheet (recommended)"
          body="Drive copies the file in one step. It cannot time out or run out of memory, and you can open it like any spreadsheet. Restore it by hand in Drive rather than through this page." />
        <Choice value="FULL" title="Full backup as a file"
          body="Every module written out as JSON. Downloadable, portable, and the only kind that can be restored from this page. On a very large database this is the one that can run out of time." />
        <Choice value="MODULE" title="Only certain modules"
          body="The same file, limited to what you choose. Useful before an import, when only one part of the system is about to change." />
      </div>

      {type === 'MODULE' && (
        <fieldset className="mt-4 rounded border border-forest-100 p-3">
          <legend className="px-1 text-xs font-bold">Modules to include</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {modules.map((m) => (
              <label key={m.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={picked.includes(m.key)} onChange={() => toggle(m.key)} />
                <span>{m.label}<span className="block text-xs text-forest-700">{m.sheets.join(', ')}</span></span>
              </label>))}
          </div>
        </fieldset>)}

      {type !== 'SNAPSHOT' && (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">File type</legend>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={format === 'ZIP'} onChange={() => setFormat('ZIP')} />Zipped JSON (much smaller)</label>
            <label className="flex items-center gap-2"><input type="radio" checked={format === 'JSON'} onChange={() => setFormat('JSON')} />Plain JSON</label>
          </div>
        </fieldset>)}

      <label className="mt-4 block text-sm font-medium" htmlFor="bk-note">Note (optional)</label>
      <input id="bk-note" className={`mt-1 ${inputCls}`} value={note} maxLength={120}
        onChange={(e) => setNote(e.target.value)} placeholder="e.g. before importing the new master list" />

      <div className="mt-5 flex justify-end gap-3">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button disabled={mut.isPending || (type === 'MODULE' && !picked.length)} className={btnPrimary}
          onClick={() => mut.mutate({ type, format, modules: picked, note }, { onSuccess: onClose })}>
          {mut.isPending ? 'Creating...' : 'Create backup'}
        </button>
      </div>
      {mut.isPending && <p className="mt-3 text-xs text-forest-700">This can take up to a minute on a large database. Leave the page open.</p>}
    </Modal>
  );
}

/* ---------- Schedule ---------- */

function ScheduleCard({ schedule }) {
  const mut = useBackupAction('schedule');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ frequency: schedule.frequency, enabled: schedule.enabled, type: schedule.type, keep: schedule.keep });

  return (
    <section className="rounded-xl border border-forest-100 bg-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
        <CalendarClock size={15} aria-hidden="true" />Automatic backup
      </h2>
      {schedule.enabled
        ? <p className="text-sm">A <strong>{schedule.frequency.toLowerCase()}</strong> {schedule.type === 'FULL' ? 'full' : 'snapshot'} backup, keeping the newest {schedule.keep}.</p>
        : <p className="text-sm">Automatic backups are <strong>off</strong>.</p>}
      {schedule.enabled && !schedule.installed && (
        <p role="alert" className="mt-2 rounded bg-amber-50 p-2.5 text-xs">
          The schedule is saved but its trigger is missing. Open the Apps Script editor and run <code>setupSystemCenter</code> once.
        </p>)}
      <p className="mt-2 text-xs text-forest-700">
        Scheduled for midnight. Google runs a daily trigger somewhere inside the hour you ask for, so it
        lands between 12:00 and 1:00 am — it cannot be made exact, and nothing depends on it being exact.
      </p>
      {schedule.lastRun && (
        <p className="mt-2 text-xs text-forest-700">
          Last run {when(schedule.lastRun)} — {schedule.lastResult === 'SUCCESS'
            ? <span className="font-semibold text-green-800">succeeded</span>
            : <span className="font-semibold text-red-700">{schedule.lastResult}</span>}
        </p>)}
      <button onClick={() => setOpen(true)} className={`${btnGhost} mt-4`}>Change</button>

      {open && (
        <Modal title="Automatic backup" onClose={() => setOpen(false)}>
          <ErrorBanner error={mut.error} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
            Back up automatically
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">How often
              <select className={`mt-1 ${inputCls}`} value={f.frequency} disabled={!f.enabled}
                onChange={(e) => setF({ ...f, frequency: e.target.value })}>
                <option value="DAILY">Daily</option><option value="WEEKLY">Weekly (Sunday)</option><option value="MONTHLY">Monthly (the 1st)</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Kind
              <select className={`mt-1 ${inputCls}`} value={f.type} disabled={!f.enabled}
                onChange={(e) => setF({ ...f, type: e.target.value })}>
                <option value="SNAPSHOT">Snapshot (recommended)</option><option value="FULL">Full JSON</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Keep the newest
              <input className={`mt-1 ${inputCls}`} inputMode="numeric" value={f.keep} disabled={!f.enabled}
                onChange={(e) => setF({ ...f, keep: e.target.value })} />
              <span className="mt-1 block text-xs text-forest-700">Older automatic backups are removed. Backups you made by hand are never removed.</span>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={() => setOpen(false)} className={btnGhost}>Cancel</button>
            <button className={btnPrimary} disabled={mut.isPending}
              onClick={() => mut.mutate(f, { onSuccess: () => setOpen(false) })}>
              {mut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>)}
    </section>
  );
}

/* ---------- Restore ---------- */

function RestoreDialog({ backup, modules, onClose }) {
  const mut = useBackupAction('restore');
  const [picked, setPicked] = useState([]);
  const [done, setDone] = useState(null);
  const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  if (done) {
    return (
      <Modal title="Restore finished" onClose={onClose}>
        <p className="text-sm">{done.message}</p>
        <p className="mt-3 text-sm">A copy of the data as it was a moment ago was saved first, as
          <strong> {done.safetyBackup}</strong>. If this restore was a mistake, that is the way back.</p>
        <div className="mt-5 flex justify-end"><button onClick={onClose} className={btnPrimary}>Close</button></div>
      </Modal>);
  }

  return (
    <DangerDialog
      title={'Restore from ' + backup.name}
      phrase="RESTORE BACKUP"
      actionLabel="Restore this backup"
      summary={picked.length ? 'Restore ' + picked.length + ' module(s) from ' + backup.name : 'Restore everything from ' + backup.name}
      busy={mut.isPending}
      error={mut.error}
      onCancel={onClose}
      onConfirm={(creds) => mut.mutate({ ...creds, id: backup.backupId, modules: picked }, { onSuccess: setDone })}
      impact={[{ sheet: 'Backup contents', label: 'Rows in this backup', rows: backup.recordCount, how: 'written over what is there now' }]}
    >
      <div className="mt-4">
        <p className="text-sm font-medium">Restore everything, or only some modules?</p>
        <p className="mb-2 text-xs text-forest-700">
          Leave all unticked to restore everything in the backup. Each sheet restored is replaced whole, not
          merged — anything added since this backup was taken is lost for the sheets you restore.
        </p>
        <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded border border-forest-100 p-2 sm:grid-cols-2">
          {modules.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={picked.includes(m.key)} onChange={() => toggle(m.key)} />{m.label}
            </label>))}
        </div>
      </div>
    </DangerDialog>);
}

/* ---------- Page ---------- */

export default function BackupCenter() {
  const t = useTableState({ type: '' });
  const { data, isLoading, error } = useBackups({ q: t.search, type: t.filters.type });
  const del = useBackupAction('delete');
  const [modal, setModal] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState(null);

  const download = async (b) => {
    setBusyId(b.backupId); setNotice(null);
    try {
      const r = await systemService.download(useAuthStore.getState().token, { id: b.backupId });
      if (r.inline) saveBase64(r.name, r.mimeType, r.base64);
      else setNotice({ kind: 'link', url: r.url, text: r.reason });
    } catch (e) {
      setNotice({ kind: 'error', text: e.message });
    } finally { setBusyId(''); }
  };

  const columns = [
    { key: 'name', header: 'Backup', value: (b) => b.name,
      render: (b) => (<div><span className="font-mono text-xs font-semibold">{b.name}</span>
        {b.note && <span className="block text-xs text-forest-700">{b.note}</span>}</div>) },
    { key: 'type', header: 'Type', value: (b) => b.type,
      render: (b) => { const m = TYPE_META[b.type] || TYPE_META.FULL; const I = m.icon;
        return <span title={m.note} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${m.tone}`}>
          <I size={12} aria-hidden="true" />{m.label}</span>; } },
    { key: 'by', header: 'Created by', value: (b) => b.createdByName,
      render: (b) => <span className="text-sm">{b.createdBy === 'system' ? 'Automatic' : b.createdByName}</span> },
    { key: 'date', header: 'Created', value: (b) => b.createdDate, render: (b) => <span className="text-xs">{when(b.createdDate)}</span> },
    { key: 'size', header: 'Size', value: (b) => String(b.fileSize), render: (b) => <span className="font-mono text-xs">{fileSize(b.fileSize)}</span> },
    { key: 'status', header: 'Status', value: (b) => b.status,
      render: (b) => <span className={`rounded px-2 py-0.5 text-xs font-semibold ${b.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{b.status}</span> }
  ];

  const modules = data?.modules || [];

  return (
    <>
      <PageHeader title="Backup & Restore" subtitle="Copies of the system's data, and the way back from a mistake."
        actions={<button onClick={() => setModal({ type: 'create' })} className={`${btnPrimary} inline-flex items-center gap-2`}>
          <Plus size={15} aria-hidden="true" />Create backup</button>} />

      <SystemReady ready={data?.ready} />

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        {data?.schedule && <ScheduleCard schedule={data.schedule} />}
        <section className="rounded-xl border border-forest-100 bg-surface p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
            <HardDrive size={15} aria-hidden="true" />Where backups are kept
          </h2>
          <p className="text-sm">In a Drive folder named <strong>WIPMS_BACKUPS</strong>, in the Google account that owns this script.</p>
          <p className="mt-2 text-xs text-forest-700">
            They hold every student's record, so they are not shared by link. Another administrator who needs to
            download them should be given access to that folder in Drive directly.
          </p>
          <p className="mt-2 text-xs text-forest-700">{data?.total || 0} backup{data?.total === 1 ? '' : 's'} kept.</p>
        </section>
      </div>

      {notice && (
        <div role="status" className={`mb-4 flex flex-wrap items-center gap-3 rounded-lg p-3 text-sm ${notice.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50'}`}>
          <span>{notice.text}</span>
          {notice.url && <a href={notice.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
            Open in Drive<ExternalLink size={12} aria-hidden="true" /></a>}
          <button onClick={() => setNotice(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>)}

      <FilterBar searchPlaceholder="Search by name or note..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={[{ key: 'type', label: 'Type', options: [{ value: 'SNAPSHOT', label: 'Snapshot' }, { value: 'FULL', label: 'Full' }, { value: 'MODULE', label: 'Modules' }] }]}
        values={t.filters} onApply={t.setFilters} onReset={t.reset} />

      <DataTable
        columns={columns} rows={data?.backups || []} getRowId={(b) => b.backupId}
        loading={isLoading} error={error} unit="backup"
        empty={{ title: 'No backups yet', body: 'Create one now, or leave the automatic backup to make the first one tonight.' }}
        rowActions={(b) => (b.status !== 'READY' ? <span className="text-xs text-forest-700">Nothing to act on</span> : (<>
          <button onClick={() => download(b)} disabled={busyId === b.backupId} className="inline-flex items-center gap-1 font-semibold underline">
            {busyId === b.backupId ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Download size={12} aria-hidden="true" />}Download
          </button>
          {b.type !== 'SNAPSHOT' && (
            <button onClick={() => setModal({ type: 'restore', backup: b })} className="ml-3 inline-flex items-center gap-1 font-semibold text-amber-600 underline">
              <RotateCcw size={12} aria-hidden="true" />Restore
            </button>)}
          <button onClick={() => setModal({ type: 'delete', backup: b })} className="ml-3 inline-flex items-center gap-1 font-semibold text-red-700 underline">
            <Trash2 size={12} aria-hidden="true" />Delete
          </button>
        </>))} />

      {modal?.type === 'create' && <CreateBackup modules={modules} onClose={() => setModal(null)} />}
      {modal?.type === 'restore' && <RestoreDialog backup={modal.backup} modules={modules} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={'Delete ' + modal.backup.name + '?'}
          text="The backup file is moved to the Drive trash and the entry is removed from this list. The data it holds is not affected."
          confirmLabel="Delete backup" busy={del.isPending} error={del.error}
          onCancel={() => setModal(null)}
          onConfirm={() => del.mutate({ id: modal.backup.backupId }, { onSuccess: () => setModal(null) })} />)}
    </>
  );
}
