import { useState } from 'react';
import StatCard from '../components/StatCard';
import { ConfirmDialog, ErrorBanner, Field, Modal, StatusPill, inputCls } from '../components/ui';
import { DataTable, FilterBar, PageHeader, btnGhost, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useRosterAction, useTeacher, useTeachers, useWorkload } from '../hooks/useRoster';

const BLANK = { employeeNumber: '', firstName: '', lastName: '', email: '', contactNumber: '', department: 'Senior High School', position: 'Teacher I', status: 'ACTIVE' };
const phone = (v) => { let s = String(v || '').replace(/[\s-]/g, ''); if (/^\+63/.test(s)) s = '0' + s.slice(3); else if (/^63/.test(s)) s = '0' + s.slice(2); return s; };
const EMPTY = { status: '', department: '' };

function TeacherForm({ teacher, departments, positions, onClose, onSaved }) {
  const edit = !!teacher;
  const mut = useRosterAction(edit ? '/teachers/update' : '/teachers/create');
  const [f, setF] = useState({ ...BLANK, ...(teacher || {}) });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errs[k]) setErrs({ ...errs, [k]: undefined }); };
  const submit = (e) => {
    e.preventDefault();
    const v = {};
    ['firstName', 'lastName', 'employeeNumber'].forEach((k) => { if (!String(f[k]).trim()) v[k] = 'This field is required'; });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) v.email = 'Enter a valid email';
    if (f.contactNumber && !/^09\d{9}$/.test(phone(f.contactNumber))) v.contactNumber = 'Use a mobile number like 09123456789';
    setErrs(v); if (Object.keys(v).length) return;
    mut.mutate({ ...f, id: teacher?.teacherId }, { onSuccess: onSaved, onError: (err) => setErrs(err.fields || {}) });
  };
  const text = (k, label, props = {}, hint) => <Field label={label} error={errs[k]} hint={hint}><input value={f[k] ?? ''} onChange={set(k)} className={`mt-1 ${inputCls}`} {...props} /></Field>;
  const pick = (k, label, options) => <Field label={label} error={errs[k]}><select value={f[k]} onChange={set(k)} className={`mt-1 ${inputCls}`}>{options.map((o) => <option key={o}>{o}</option>)}</select></Field>;
  return (
    <Modal title={edit ? 'Edit teacher' : 'Add teacher'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('employeeNumber', 'Employee number', { maxLength: 30 })}
          {edit && <Field label="Teacher ID"><input value={teacher.teacherId} disabled className={`mt-1 ${inputCls}`} /></Field>}
          {text('firstName', 'First name', { maxLength: 60 })}
          {text('lastName', 'Last name', { maxLength: 60 })}
          {text('email', 'Email (login)', { type: 'email', maxLength: 100 }, edit ? 'Changing this changes their sign-in email' : 'Creates a login with a one-time password')}
          {text('contactNumber', 'Contact number', { inputMode: 'tel' }, 'Optional')}
          {pick('department', 'Department', departments)}
          {pick('position', 'Position', positions)}
          {edit && pick('status', 'Status', ['ACTIVE', 'INACTIVE'])}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Saving...' : edit ? 'Save changes' : 'Create teacher'}</button>
        </div>
      </form>
    </Modal>
  );
}

function TeacherDetail({ id, onClose }) {
  const { data, error, isLoading } = useTeacher(id);
  const t = data?.teacher;
  const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v || '-'}</dd></div>;
  return (
    <Modal title="Teacher details" onClose={onClose} wide>
      {isLoading && <p className="text-sm">Loading...</p>}<ErrorBanner error={error} />
      {t && <>
        <div className="mb-3 flex items-center justify-between"><p className="text-lg font-bold">{t.name}</p><StatusPill status={t.status} /></div>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <div className="divide-y divide-forest-100"><Row k="Teacher ID" v={t.teacherId} /><Row k="Employee number" v={t.employeeNumber} /><Row k="Email" v={t.email} /><Row k="Contact number" v={t.contactNumber} /></div>
          <div className="divide-y divide-forest-100"><Row k="Department" v={t.department} /><Row k="Position" v={t.position} /><Row k="Students assigned" v={t.students} /><Row k="Active / deployed" v={`${t.activeStudents} / ${t.deployedStudents}`} /></div>
        </dl>
        <h3 className="mb-2 mt-5 text-sm font-bold">Assigned students</h3>
        <div className="overflow-x-auto rounded-lg border border-forest-100"><table className="w-full text-left text-sm">
          <thead className="bg-forest-100/60"><tr><th className="p-2.5">Student</th><th className="p-2.5">Class</th><th className="p-2.5">Institution</th><th className="p-2.5">Status</th></tr></thead>
          <tbody>
            {data.students.map((s) => <tr key={s.studentId} className="border-t border-forest-100"><td className="p-2.5 font-medium">{s.name}</td><td className="p-2.5">{s.className}</td><td className="p-2.5">{s.institutionName || 'Unassigned'}</td><td className="p-2.5"><StatusPill status={s.status} /></td></tr>)}
            {!data.students.length && <tr><td className="p-4 text-center" colSpan={4}>No students are assigned to this teacher.</td></tr>}
          </tbody></table></div>
      </>}
    </Modal>
  );
}

function WorkloadPanel() {
  const { data: d, error } = useWorkload();
  const assign = useRosterAction('/teachers/assign-students');
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [picked, setPicked] = useState([]);
  const [msg, setMsg] = useState('');
  const s = d?.summary;
  const toggle = (id) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const max = Math.max(1, ...(d?.teachers || []).map((x) => x.activeStudents));
  const columns = [
    { key: 'name', header: 'Teacher', value: (t) => t.name, render: (t) => <><span className="font-medium">{t.name}</span><span className="block text-xs text-forest-700">{t.position}</span></> },
    { key: 'department', header: 'Department', value: (t) => t.department, render: (t) => t.department },
    { key: 'load', header: 'Active students', value: (t) => t.activeStudents,
      render: (t) => <div className="flex items-center gap-2"><div className="h-2 min-w-16 flex-1 overflow-hidden rounded bg-forest-100"><div className="h-full bg-amber-500" style={{ width: `${(t.activeStudents / max) * 100}%` }} /></div><span className="w-8 text-right tabular-nums">{t.activeStudents}</span></div> },
    { key: 'deployed', header: 'Deployed', align: 'right', value: (t) => t.deployedStudents, render: (t) => t.deployedStudents },
    { key: 'status', header: 'Status', value: (t) => t.status, render: (t) => <StatusPill status={t.status} /> }
  ];
  return (
    <>
      <ErrorBanner error={error} />
      {msg && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Teachers" value={s?.teachers} hint={s && `${s.activeTeachers} active`} />
        <StatCard label="Students assigned" value={s?.assignedStudents} />
        <StatCard label="Average per teacher" value={s?.averageLoad ?? '-'} />
        <StatCard label="Busiest / lightest" value={s ? `${s.busiest} / ${s.lightest}` : '-'} />
        <StatCard label="Unassigned students" value={s?.unassignedStudents} />
      </div>
      {s?.unassignedStudents > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded bg-amber-50 p-3 text-sm">
          <span>{s.unassignedStudents} active student(s) have no teacher. They cannot record attendance or submit journals until they do.</span>
          <button className={btnPrimary} onClick={() => { setMsg(''); setOpen(true); }}>Assign students</button>
        </div>)}
      <DataTable columns={columns} rows={d?.teachers} getRowId={(t) => t.teacherId} loading={!d && !error} caption="Teacher workload"
        empty={{ title: 'No teachers yet', body: 'Add a teacher to start assigning students.' }} />

      {open && d && (
        <Modal title="Assign students to a teacher" onClose={() => setOpen(false)} wide>
          <Field label="Teacher"><select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={`mt-1 ${inputCls}`}>
            <option value="">Select</option>{d.teachers.filter((x) => x.status === 'ACTIVE').map((x) => <option key={x.teacherId} value={x.teacherId}>{x.name} ({x.activeStudents} students)</option>)}</select></Field>
          <div className="mt-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Students with no teacher ({d.unassigned.length})</h3>
            <button className="text-sm font-semibold text-amber-600 underline" onClick={() => setPicked(picked.length === d.unassigned.length ? [] : d.unassigned.map((x) => x.studentId))}>{picked.length === d.unassigned.length ? 'Clear all' : 'Select all'}</button>
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-forest-100 p-3">
            {d.unassigned.map((u) => <label key={u.studentId} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" checked={picked.includes(u.studentId)} onChange={() => toggle(u.studentId)} />{u.name} <span className="text-xs text-forest-700">{u.className}</span></label>)}
            {!d.unassigned.length && <p className="text-sm">Every active student already has a teacher.</p>}
          </div>
          <div className="mt-3"><ErrorBanner error={assign.error} /></div>
          <div className="mt-4 flex justify-end gap-3">
            <button className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button className={btnPrimary} disabled={!teacherId || !picked.length || assign.isPending}
              onClick={() => assign.mutate({ teacherId, studentIds: picked }, { onSuccess: (r) => { setOpen(false); setPicked([]); setTeacherId(''); setMsg(`${r.moved} student(s) assigned.`); } })}>
              {assign.isPending ? 'Assigning...' : `Assign ${picked.length} student(s)`}</button>
          </div>
        </Modal>)}
    </>
  );
}

export default function TeachersPage() {
  const [tab, setTab] = useState('list');
  const t = useTableState(EMPTY, { key: 'name', dir: 'asc' });
  const [modal, setModal] = useState(null);
  const query = useTeachers({ ...t.params, pageSize: 10 });
  const status = useRosterAction('/teachers/status');
  const reset = useRosterAction('/teachers/reset-password');
  const d = query.data;

  const filters = [
    { key: 'status', label: 'Status', options: [{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }] },
    { key: 'department', label: 'Department', options: (d?.departments || []).map((x) => ({ value: x, label: x })) }
  ];
  const columns = [
    { key: 'name', header: 'Teacher', sortable: true, value: (x) => `${x.lastName}, ${x.firstName}`,
      render: (x) => <><span className="font-medium">{x.lastName}, {x.firstName}</span><span className="block text-xs text-forest-700">{x.position}</span></> },
    { key: 'employeeNumber', header: 'Employee no.', sortable: true, value: (x) => x.employeeNumber, render: (x) => x.employeeNumber || '-' },
    { key: 'email', header: 'Email', sortable: true, value: (x) => x.email, render: (x) => x.email },
    { key: 'department', header: 'Department', sortable: true, value: (x) => x.department, render: (x) => x.department },
    { key: 'students', header: 'Students', sortable: true, align: 'right', value: (x) => x.activeStudents, render: (x) => x.activeStudents },
    { key: 'status', header: 'Status', sortable: true, value: (x) => x.status, render: (x) => <StatusPill status={x.status} /> }
  ];
  const tabBtn = (k, label) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-forest-800 text-white' : 'border border-forest-100 bg-white'}`}>{label}</button>;

  return (
    <>
      <PageHeader title="Teachers" actions={d ? <button className={btnPrimary} onClick={() => setModal({ type: 'form' })}>Add teacher</button> : null} />
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">{tabBtn('list', 'Teacher list')}{tabBtn('workload', 'Workload & assignment')}</div>

      {tab === 'workload' ? <WorkloadPanel /> : <>
        <FilterBar searchPlaceholder="Search teachers..." search={t.searchInput} onSearch={t.setSearchInput}
          filters={filters} values={t.filters} onApply={t.setFilters} onReset={t.reset}
          onExport={() => exportCsv('teachers', columnsToCsv(columns), d?.items || [])} />
        <DataTable columns={columns} rows={d?.items} getRowId={(x) => x.teacherId} loading={query.isLoading} error={query.error}
          sort={t.sort} onSort={t.onSort} caption="Teachers"
          empty={{ title: 'No teachers found', body: t.search || Object.values(t.filters).some(Boolean) ? 'No teacher matches this search or filter.' : 'Add the first teacher.' }}
          pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="teacher"
          rowActions={(x) => (<>
            <button className="font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'view', id: x.teacherId })}>View</button>
            <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'form', teacher: x })}>Edit</button>
            <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => { reset.reset(); setModal({ type: 'reset', teacher: x }); }}>Reset password</button>
            <button className={`ml-3 font-semibold underline ${x.status === 'ACTIVE' ? 'text-red-700' : 'text-green-700'}`} onClick={() => { status.reset(); setModal({ type: 'status', teacher: x }); }}>{x.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}</button>
          </>)} />
      </>}

      {modal?.type === 'form' && d && <TeacherForm teacher={modal.teacher} departments={d.departments} positions={d.positions} onClose={() => setModal(null)}
        onSaved={(r) => setModal(r.tempPassword ? { type: 'password', email: r.teacher.email, password: r.tempPassword } : null)} />}
      {modal?.type === 'view' && <TeacherDetail id={modal.id} onClose={() => setModal(null)} />}
      {modal?.type === 'status' && (
        <ConfirmDialog title={modal.teacher.status === 'ACTIVE' ? 'Deactivate teacher?' : 'Reactivate teacher?'} confirmLabel={modal.teacher.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
          busy={status.isPending} error={status.error} onCancel={() => setModal(null)}
          text={modal.teacher.status === 'ACTIVE'
            ? `${modal.teacher.name} will be signed out and cannot log in. Their ${modal.teacher.students} student(s) stay assigned to them until you move them from the workload tab.`
            : `${modal.teacher.name} will be able to log in again.`}
          onConfirm={() => status.mutate({ id: modal.teacher.teacherId, status: modal.teacher.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, { onSuccess: () => setModal(null) })} />)}
      {modal?.type === 'reset' && (
        <ConfirmDialog title="Reset password?" confirmLabel="Reset" busy={reset.isPending} error={reset.error} onCancel={() => setModal(null)}
          text={`Create a new temporary password for ${modal.teacher.name}? They will be signed out everywhere.`}
          onConfirm={() => reset.mutate({ id: modal.teacher.teacherId }, { onSuccess: (r) => setModal({ type: 'password', email: modal.teacher.email, password: r.tempPassword }) })} />)}
      {modal?.type === 'password' && (
        <Modal title="Temporary password" onClose={() => setModal(null)}>
          <p className="text-sm">Give these details to the teacher. The password is shown only once.</p>
          <dl className="mt-3 rounded bg-forest-100/60 p-3 text-sm"><dt className="text-forest-700">Email</dt><dd className="font-mono">{modal.email}</dd><dt className="mt-2 text-forest-700">Temporary password</dt><dd className="font-mono">{modal.password}</dd></dl>
          <div className="mt-4 flex gap-3"><button className={`flex-1 ${btnGhost}`} onClick={() => navigator.clipboard?.writeText(`${modal.email} / ${modal.password}`)}>Copy</button>
            <button className={`flex-1 ${btnPrimary}`} onClick={() => setModal(null)}>Done</button></div>
        </Modal>)}
    </>
  );
}
