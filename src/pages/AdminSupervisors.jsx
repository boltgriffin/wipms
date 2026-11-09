import { useState } from 'react';
import { ConfirmDialog, ErrorBanner, Field, Modal, inputCls } from '../components/ui';
import { DataTable, FilterBar, PageHeader, btnGhost, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { Tag } from '../components/supervisorUi';
import { useMeta } from '../hooks/useManagement';
import { useAction, useSupervisorsList } from '../hooks/useSupervisor';

function SupervisorForm({ sup, institutions, onClose, onSaved }) {
  const edit = !!sup;
  const mut = useAction(edit ? '/supervisors/update' : '/supervisors/create');
  const [f, setF] = useState({ fullName: sup?.fullName || '', email: sup?.email || '', status: sup?.status || 'ACTIVE', institutionIds: sup?.institutions.map((i) => i.id) || [] });
  const [errs, setErrs] = useState({});
  const toggle = (id) => setF({ ...f, institutionIds: f.institutionIds.includes(id) ? f.institutionIds.filter((x) => x !== id) : [...f.institutionIds, id] });
  const submit = (e) => {
    e.preventDefault();
    const v = {};
    if (!f.fullName.trim()) v.fullName = 'Full name is required';
    if (!edit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) v.email = 'Enter a valid email';
    if (!f.institutionIds.length) v.institutionIds = 'Choose at least one institution';
    setErrs(v); if (Object.keys(v).length) return;
    mut.mutate({ ...f, id: sup?.id }, { onSuccess: onSaved, onError: (err) => setErrs(err.fields || {}) });
  };
  return (
    <Modal title={edit ? 'Edit supervisor' : 'Add supervisor'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <Field label="Full name" error={errs.fullName}><input value={f.fullName} maxLength={80} onChange={(e) => setF({ ...f, fullName: e.target.value })} className={`mt-1 ${inputCls}`} /></Field>
        <Field label="Email (login)" error={errs.email}><input type="email" disabled={edit} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={`mt-1 ${inputCls}`} /></Field>
        {edit && <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={`mt-1 ${inputCls}`}><option>ACTIVE</option><option>INACTIVE</option></select></Field>}
        <fieldset><legend className="text-sm font-medium">Institutions they supervise</legend>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded border border-forest-100 p-3">
            {institutions.map((i) => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.institutionIds.includes(i.id)} onChange={() => toggle(i.id)} />{i.name}</label>)}
            {!institutions.length && <p className="text-sm">No institutions yet. Add one first.</p>}
          </div>{errs.institutionIds && <p role="alert" className="mt-1 text-xs text-red-700">{errs.institutionIds}</p>}</fieldset>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Saving...' : edit ? 'Save changes' : 'Create supervisor'}</button></div>
      </form>
    </Modal>
  );
}

export default function AdminSupervisors() {
  const list = useSupervisorsList();
  const { data: meta } = useMeta();
  const reset = useAction('/supervisors/reset-password');
  const t = useTableState({ status: '' }, { key: 'name', dir: 'asc' });
  const [modal, setModal] = useState(null);
  const all = list.data?.supervisors || [];
  const rows = all.filter((s) => (!t.search || (s.fullName + s.email).toLowerCase().includes(t.search.toLowerCase())) && (!t.filters.status || s.status === t.filters.status))
    .sort((a, b) => (t.sort?.dir === 'desc' ? -1 : 1) * a.fullName.localeCompare(b.fullName));
  const filters = [{ key: 'status', label: 'Status', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }] }];
  const columns = [
    { key: 'name', header: 'Supervisor', sortable: true, value: (s) => s.fullName, render: (s) => <span className="font-medium">{s.fullName}</span> },
    { key: 'email', header: 'Email', value: (s) => s.email, render: (s) => s.email },
    { key: 'institutions', header: 'Institutions', value: (s) => s.institutions.map((i) => i.name).join('; '), render: (s) => s.institutions.map((i) => i.name).join(', ') || '-' },
    { key: 'status', header: 'Status', value: (s) => s.status, render: (s) => <Tag text={s.status === 'ACTIVE' ? 'Verified' : 'Disputed'} /> }
  ];
  return (
    <>
      <PageHeader title="Supervisors" actions={meta ? <button className={btnPrimary} onClick={() => setModal({ type: 'form' })}>Add supervisor</button> : null} />
      <FilterBar searchPlaceholder="Search supervisors..." search={t.searchInput} onSearch={t.setSearchInput} filters={filters} values={t.filters}
        onApply={t.setFilters} onReset={t.reset} onExport={() => exportCsv('supervisors', columnsToCsv(columns), rows)} />
      <DataTable columns={columns} rows={rows} loading={list.isLoading} error={list.error} sort={t.sort} onSort={t.onSort} caption="Supervisors"
        empty={{ title: 'No supervisors found', body: t.search || t.filters.status ? 'Nothing matches this search or filter.' : 'Add a workplace supervisor so they can verify attendance and evaluate students.' }}
        rowActions={(s) => (<>
          <button className="font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'form', sup: s })}>Edit</button>
          <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => { reset.reset(); setModal({ type: 'reset', sup: s }); }}>Reset password</button>
        </>)} />

      {modal?.type === 'form' && meta && <SupervisorForm sup={modal.sup} institutions={meta.institutions} onClose={() => setModal(null)}
        onSaved={(r) => setModal(r.tempPassword ? { type: 'password', email: r.supervisor.email, password: r.tempPassword } : null)} />}
      {modal?.type === 'reset' && <ConfirmDialog title="Reset password?" confirmLabel="Reset" busy={reset.isPending} error={reset.error} onCancel={() => setModal(null)}
        text={`Create a new temporary password for ${modal.sup.fullName}? They will be signed out everywhere.`}
        onConfirm={() => reset.mutate({ id: modal.sup.id }, { onSuccess: (r) => setModal({ type: 'password', email: modal.sup.email, password: r.tempPassword }) })} />}
      {modal?.type === 'password' && (
        <Modal title="Temporary password" onClose={() => setModal(null)}>
          <p className="text-sm">Give these details to the supervisor. The password is shown only once.</p>
          <dl className="mt-3 rounded bg-forest-100/60 p-3 text-sm"><dt className="text-forest-700">Email</dt><dd className="font-mono">{modal.email}</dd><dt className="mt-2 text-forest-700">Temporary password</dt><dd className="font-mono">{modal.password}</dd></dl>
          <div className="mt-4 flex gap-3"><button className={`flex-1 ${btnGhost}`} onClick={() => navigator.clipboard?.writeText(`${modal.email} / ${modal.password}`)}>Copy</button>
            <button className={`flex-1 ${btnPrimary}`} onClick={() => setModal(null)}>Done</button></div>
        </Modal>)}
    </>
  );
}
