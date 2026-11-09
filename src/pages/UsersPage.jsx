import { useMemo, useState } from 'react';
import { AlertTriangle, Download, KeyRound, Printer, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react';
import {
  DataTable, EmptyState, FilterBar, LoadingState, PageHeader, Pagination,
  btnGhost, btnPrimary, inputCls, useTableState
} from '../components/datatable';
import { ErrorBanner, Field, Modal } from '../components/ui';
import { StatTile } from '../components/deployUi';
import { fetchCredentials, useAccountAction, useAccountSettings, useUsers } from '../hooks/useAccounts';
import { useBranding } from '../hooks/useShell';
import { exportCredentialSlips, exportCredentialsXlsx } from '../export/credentials';

const PAGE = 15;
const ROLE_TONE = { ADMIN: 'bg-violet-100 text-violet-800', TEACHER: 'bg-blue-100 text-blue-800', STUDENT: 'bg-teal-100 text-teal-900', SUPERVISOR: 'bg-amber-100 text-amber-900' };
const STATUS_TONE = { ACTIVE: 'bg-green-100 text-green-800', INACTIVE: 'bg-gray-200 text-gray-700', ARCHIVED: 'bg-gray-100 text-gray-500' };
const Tag = ({ tone, children }) => <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>;

const FILTERS = [
  { key: 'role', label: 'Role', type: 'select', options: [{ value: '', label: 'All' }, { value: 'STUDENT', label: 'Student' }, { value: 'TEACHER', label: 'Teacher' }, { value: 'SUPERVISOR', label: 'Supervisor' }, { value: 'ADMIN', label: 'Admin' }] },
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ARCHIVED', label: 'Archived' }] },
  { key: 'password', label: 'Password', type: 'select', options: [{ value: '', label: 'All' }, { value: 'default', label: 'Still the issued one' }, { value: 'changed', label: 'Changed by the owner' }] }
];

/** Creating the accounts a role is missing. Safe to repeat: anyone who has one is skipped. */
function GenerateModal({ onClose }) {
  const mut = useAccountAction('generate');
  const [role, setRole] = useState('STUDENT');
  const [people, setPeople] = useState('');
  const [done, setDone] = useState(null);

  const submit = () => {
    const payload = { role };
    if (role === 'SUPERVISOR') {
      payload.people = people.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [fullName, email] = l.split(',').map((x) => (x || '').trim());
        return { fullName, email };
      });
    }
    mut.mutate(payload, { onSuccess: setDone });
  };

  if (done) {
    return (
      <Modal wide title="Accounts created" onClose={onClose}>
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <span className="font-semibold">{done.created} account{done.created === 1 ? '' : 's'} created.</span>
          {done.skipped > 0 && ` ${done.skipped} skipped.`}
          {done.created > 0 && ' Each username and password is the person’s reference ID.'}
        </p>
        {done.accounts?.length > 0 && (
          <div className="mt-3 max-h-60 overflow-y-auto rounded-lg border border-forest-100">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-paper text-xs uppercase tracking-wide text-forest-700">
                <tr><th scope="col" className="px-3 py-2 text-left font-semibold">Name</th><th scope="col" className="px-3 py-2 text-left font-semibold">Username</th><th scope="col" className="px-3 py-2 text-left font-semibold">Password</th></tr>
              </thead>
              <tbody className="divide-y divide-forest-100">
                {done.accounts.map((a) => (
                  <tr key={a.userId}><td className="px-3 py-1.5">{a.name}</td><td className="px-3 py-1.5 font-mono text-xs">{a.username}</td><td className="px-3 py-1.5 font-mono text-xs">{a.password}</td></tr>))}
              </tbody>
            </table>
          </div>)}
        {done.skippedDetail?.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-forest-700">
            {done.skippedDetail.map((x, i) => <li key={i}>{x.name}: {x.reason}</li>)}
          </ul>)}
        <p className="mt-3 text-sm">Export the credentials from the users page to print the slips.</p>
        <button onClick={onClose} className={`${btnPrimary} mt-4`}>Close</button>
      </Modal>
    );
  }

  return (
    <Modal title="Generate accounts" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Who for?">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="STUDENT">Students without an account</option>
            <option value="TEACHER">Teachers without an account</option>
            <option value="SUPERVISOR">New supervisors</option>
          </select>
        </Field>

        {role === 'SUPERVISOR' ? (
          <Field label="One supervisor per line" hint="Name, or name and email separated by a comma. Each is given the next SUP- number.">
            <textarea rows={5} value={people} onChange={(e) => setPeople(e.target.value)} className={`mt-1 ${inputCls} font-mono text-sm`}
              placeholder={'Maria Santos, maria@abcmfg.com\nPedro Reyes'} />
          </Field>
        ) : (
          <p className="rounded-lg bg-blue-50 p-3 text-sm">
            Every {role === 'STUDENT' ? 'student' : 'teacher'} who has no sign-in yet gets one. The username and the password
            are both their {role === 'STUDENT' ? 'Student ID' : 'Employee Number'}; a teacher without an employee number is
            given the next T- number. Anyone who already has an account is left alone, so you can run this after every import.
          </p>)}

        <ErrorBanner error={mut.error} />
        <div className="flex gap-3">
          <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
          <button disabled={mut.isPending || (role === 'SUPERVISOR' && !people.trim())} className={`${btnPrimary} flex-1`} onClick={submit}>
            {mut.isPending ? 'Creating...' : 'Create accounts'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, body, danger, confirmLabel, onConfirm, onClose, pending, error }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm">{body}</p>
      <ErrorBanner error={error} />
      <div className="mt-5 flex gap-3">
        <button onClick={onClose} className={`${btnGhost} flex-1`}>Cancel</button>
        <button disabled={pending} onClick={onConfirm}
          className={`flex-1 rounded px-4 py-2 text-sm font-semibold ${danger ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-forest-800 text-white hover:bg-forest-900'} disabled:opacity-60`}>
          {pending ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const t = useTableState({ role: '', status: '', password: '' }, { key: 'name', dir: 'asc' });
  const { data, isLoading, error } = useUsers(t.params);
  const { data: settings } = useAccountSettings();
  const { branding } = useBranding();
  const reset = useAccountAction('reset');
  const status = useAccountAction('status');
  const saveSettings = useAccountAction('settings');
  const [selected, setSelected] = useState([]);
  const [gen, setGen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const rows = useMemo(() => {
    const all = data?.items || [];
    const q = t.search.toLowerCase();
    return q ? all.filter((u) => `${u.fullName} ${u.username} ${u.email}`.toLowerCase().includes(q)) : all;
  }, [data, t.search]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(t.page, pages);
  const view = rows.slice((page - 1) * PAGE, page * PAGE);
  const c = data?.counts || {};
  const chosen = rows.filter((u) => selected.includes(u.userId));

  const exportCreds = async (how) => {
    setBusy(how); setNote('');
    try {
      const r = await fetchCredentials(t.params);
      const list = chosen.length ? r.items.filter((u) => selected.includes(u.userId)) : r.items;
      if (!list.length) { setNote('Nothing to export: every account here has a password only its owner knows. Reset one first.'); return; }
      await (how === 'slips' ? exportCredentialSlips(list, branding) : exportCredentialsXlsx(list, branding));
      if (r.withheld) setNote(`${r.withheld} account${r.withheld === 1 ? ' was' : 's were'} left out because the owner has changed the password.`);
    } catch (e) { setNote(e.message || 'The export failed.'); } finally { setBusy(''); }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, value: (u) => u.fullName,
      render: (u) => <><span className="font-medium">{u.fullName}</span><span className="block text-xs text-forest-700">{u.linkedTo || u.email}</span></> },
    { key: 'username', header: 'Username', sortable: true, nowrap: true, value: (u) => u.username,
      render: (u) => <span className="font-mono text-xs">{u.username}</span> },
    { key: 'role', header: 'Role', sortable: true, nowrap: true, value: (u) => u.role, render: (u) => <Tag tone={ROLE_TONE[u.role] || 'bg-gray-100 text-gray-700'}>{u.role}</Tag> },
    { key: 'status', header: 'Status', sortable: true, nowrap: true, value: (u) => u.status, render: (u) => <Tag tone={STATUS_TONE[u.status] || ''}>{u.status}</Tag> },
    { key: 'password', header: 'Password', nowrap: true, value: (u) => (u.passwordKnown ? u.password : 'changed'),
      render: (u) => u.passwordKnown
        ? <span className="font-mono text-xs">{u.password}</span>
        : <span className="text-xs text-forest-700">Changed by owner</span> },
    { key: 'lastLogin', header: 'Last sign-in', sortable: true, nowrap: true, value: (u) => u.lastLoginAt || '',
      render: (u) => u.lastLoginAt ? String(u.lastLoginAt).slice(0, 10) : <span className="text-xs text-forest-700">Never</span> }
  ];

  return (
    <>
      <PageHeader title="Users and accounts" subtitle="Every sign-in in the system. Usernames and passwords are the person's reference ID until they change them."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setGen(true)} className={`${btnPrimary} inline-flex items-center gap-2`}><Sparkles size={15} aria-hidden="true" />Generate accounts</button>
            <button disabled={!!busy} onClick={() => exportCreds('xlsx')} className={`${btnGhost} inline-flex items-center gap-2`}><Download size={15} aria-hidden="true" />Excel</button>
            <button disabled={!!busy} onClick={() => exportCreds('slips')} className={`${btnGhost} inline-flex items-center gap-2`}><Printer size={15} aria-hidden="true" />Print slips</button>
          </div>} />

      {(c.studentsWithout > 0 || c.teachersWithout > 0) && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <UserPlus size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">
              {c.studentsWithout > 0 && `${c.studentsWithout} student${c.studentsWithout === 1 ? '' : 's'}`}
              {c.studentsWithout > 0 && c.teachersWithout > 0 && ' and '}
              {c.teachersWithout > 0 && `${c.teachersWithout} teacher${c.teachersWithout === 1 ? '' : 's'}`} cannot sign in yet.
            </span>{' '}
            Generate accounts to give them one.
          </span>
        </p>)}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Accounts" value={c.total ?? 0} hint={`${c.active ?? 0} active · ${c.inactive ?? 0} inactive · ${c.archived ?? 0} archived`} icon={Users} />
        <StatTile label="Students" value={c.students ?? 0} hint={`${c.teachers ?? 0} teachers · ${c.supervisors ?? 0} supervisors`} />
        <StatTile label="Issued password unchanged" value={c.defaultPassword ?? 0} tone={c.defaultPassword ? 'bg-amber-50' : 'bg-paper'} icon={KeyRound} />
        <StatTile label="Never signed in" value={c.neverSignedIn ?? 0} />
      </div>

      {note && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">{note}</p>}

      <FilterBar searchPlaceholder="Search name, username or email..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={FILTERS} values={t.filters} onApply={t.setFilters} onReset={() => { t.reset(); setSelected([]); }} />

      {isLoading ? <LoadingState label="Loading accounts..." />
        : !rows.length ? <EmptyState title="No accounts to show" body="Nothing matches the current search and filter." action={<button onClick={t.reset} className={btnGhost}>Reset</button>} />
          : (
            <>
              <DataTable columns={columns} rows={view} getRowId={(u) => u.userId} error={error} sort={t.sort} onSort={t.onSort}
                caption="User accounts"
                selection={{ selected, onChange: setSelected, actions: () => [
                  <button key="r" onClick={() => setConfirm({ kind: 'reset' })} className={btnGhost}>Reset password</button>,
                  <button key="a" onClick={() => setConfirm({ kind: 'status', status: 'ACTIVE' })} className={btnGhost}>Activate</button>,
                  <button key="d" onClick={() => setConfirm({ kind: 'status', status: 'INACTIVE' })} className={btnGhost}>Deactivate</button>,
                  <button key="x" onClick={() => setConfirm({ kind: 'status', status: 'ARCHIVED' })} className={btnGhost}>Archive</button>
                ] }}
                rowActions={(u) => [
                  <button key="r" onClick={() => setConfirm({ kind: 'reset', one: u })} className={btnGhost}>Reset</button>,
                  u.status === 'ACTIVE'
                    ? <button key="d" onClick={() => setConfirm({ kind: 'status', status: 'INACTIVE', one: u })} className={btnGhost}>Deactivate</button>
                    : <button key="a" onClick={() => setConfirm({ kind: 'status', status: 'ACTIVE', one: u })} className={btnGhost}>Activate</button>
                ]} />
              <Pagination page={page} pages={pages} total={rows.length} onPage={t.setPage} unit="account" />
            </>)}

      {/* The one thing about this design worth an administrator's attention */}
      <section className="mt-6 rounded-xl border border-forest-100 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-forest-700">
          <ShieldCheck size={15} aria-hidden="true" />Sign-in policy
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            A username and its password are the same reference ID, and reference IDs run in sequence, so anyone who can guess
            a classmate&rsquo;s ID can sign in as them &mdash; and record their attendance or read their evaluations. Every
            sign-in is logged against the account used, so this leaves a trail, but the trail names the account, not the person.
          </span>
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={!!settings?.requirePasswordChange}
            onChange={(e) => saveSettings.mutate({ requirePasswordChange: e.target.checked })} />
          <span>
            Ask each person to choose their own password the first time they sign in.
            <span className="block text-xs text-forest-700">Off by default. Turning it on affects accounts created or reset from then on.</span>
          </span>
        </label>
      </section>

      {gen && <GenerateModal onClose={() => setGen(false)} />}
      {confirm?.kind === 'reset' && (
        <ConfirmModal title="Reset password" error={reset.error} pending={reset.isPending} confirmLabel="Reset"
          body={`The password goes back to the person's reference ID for ${confirm.one ? confirm.one.fullName : `${chosen.length} account${chosen.length === 1 ? '' : 's'}`}. Whatever they had chosen stops working at once, so tell them before you do this.`}
          onClose={() => setConfirm(null)}
          onConfirm={() => reset.mutate({ userIds: confirm.one ? [confirm.one.userId] : selected }, {
            onSuccess: (r) => { setConfirm(null); setSelected([]); setNote(`${r.reset} password${r.reset === 1 ? '' : 's'} reset to the reference ID.`); } })} />)}
      {confirm?.kind === 'status' && (
        <ConfirmModal title={`${confirm.status === 'ACTIVE' ? 'Activate' : confirm.status === 'INACTIVE' ? 'Deactivate' : 'Archive'} account${confirm.one ? '' : 's'}`}
          danger={confirm.status !== 'ACTIVE'} error={status.error} pending={status.isPending}
          confirmLabel={confirm.status === 'ACTIVE' ? 'Activate' : confirm.status === 'INACTIVE' ? 'Deactivate' : 'Archive'}
          body={confirm.status === 'ACTIVE'
            ? 'They will be able to sign in again.'
            : confirm.status === 'INACTIVE'
              ? 'They will be refused at sign-in and told to see you. Nothing they have recorded is affected.'
              : 'The account is kept for the records and can never sign in again. Their attendance, journals and evaluations stay exactly as they are.'}
          onClose={() => setConfirm(null)}
          onConfirm={() => status.mutate({ userIds: confirm.one ? [confirm.one.userId] : selected, status: confirm.status }, {
            onSuccess: (r) => {
              setConfirm(null); setSelected([]);
              setNote(`${r.changed} account${r.changed === 1 ? '' : 's'} set to ${r.status}.${r.refused.length ? ' ' + r.refused.join('. ') + '.' : ''}`);
            } })} />)}
    </>
  );
}
