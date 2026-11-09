import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentForm from '../components/StudentForm';
import StudentDetail from '../components/StudentDetail';
import { ConfirmDialog, Modal, StatusPill } from '../components/ui';
import { DataTable, FilterBar, PageHeader, btnGhost, btnPrimary, columnsToCsv, exportCsv, useTableState } from '../components/datatable';
import { useMeta, useStudentAction, useStudents } from '../hooks/useManagement';
import { useRosterAction } from '../hooks/useRoster';
import { useAuthStore } from '../store/authStore';

const EMPTY = { grade: '', strand: '', sex: '', status: '', teacherId: '', institutionId: '' };

export default function StudentsPage() {
  const admin = useAuthStore((s) => s.user?.role) === 'ADMIN';
  const navigate = useNavigate();
  const { data: meta, error: metaError } = useMeta();
  const t = useTableState(EMPTY, { key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const query = useStudents({ ...t.params, pageSize: 10 });
  const del = useStudentAction('delete');
  const assign = useRosterAction('/teachers/assign-students');
  const d = query.data;

  const filters = [
    { key: 'grade', label: 'Grade level', anyLabel: 'All grades', options: (meta?.grades || []).map((g) => ({ value: String(g), label: `Grade ${g}` })) },
    { key: 'strand', label: 'Strand', options: (meta?.strands || []).map((s) => ({ value: s, label: s })) },
    { key: 'sex', label: 'Sex', anyLabel: 'Any sex', options: (meta?.sexes || []).map((s) => ({ value: s, label: s })) },
    { key: 'status', label: 'Status', options: (meta?.statuses || []).map((s) => ({ value: s, label: s })) },
    admin && { key: 'teacherId', label: 'Teacher', options: (meta?.teachers || []).map((x) => ({ value: x.id, label: x.name })) },
    { key: 'institutionId', label: 'Institution', options: [{ value: 'none', label: 'Unassigned' }, ...(meta?.institutions || []).map((i) => ({ value: i.id, label: i.name }))] }
  ].filter(Boolean);

  const columns = [
    { key: 'name', header: 'Student', sortable: true, value: (s) => `${s.lastName}, ${s.firstName}`,
      render: (s) => <><span className="font-medium">{s.lastName}, {s.firstName}</span><span className="block text-xs text-forest-700">{s.studentId}</span></> },
    { key: 'lrn', header: 'LRN', sortable: true, nowrap: true, value: (s) => s.lrn, render: (s) => <span className="font-mono text-xs">{s.lrn}</span> },
    { key: 'grade', header: 'Class', sortable: true, nowrap: true, value: (s) => `${s.gradeLevel} ${s.strand} - ${s.section}`, render: (s) => `${s.gradeLevel} ${s.strand} - ${s.section}` },
    { key: 'teacher', header: 'Teacher', sortable: true, value: (s) => s.teacherName, render: (s) => s.teacherName || '-' },
    { key: 'institution', header: 'Institution', sortable: true, value: (s) => s.institutionName, render: (s) => s.institutionName || 'Unassigned' },
    { key: 'status', header: 'Status', sortable: true, value: (s) => s.status, render: (s) => <StatusPill status={s.status} /> }
  ];

  const actions = [
    admin && <button key="imp" className={btnGhost} onClick={() => navigate('/admin/import')}>Import CSV</button>,
    admin && meta && <button key="add" className={btnPrimary} onClick={() => setModal({ type: 'form' })}>Add student</button>
  ].filter(Boolean);

  return (
    <>
      <PageHeader title={admin ? 'Students' : 'My students'} actions={actions} />
      <FilterBar searchPlaceholder="Search students..." search={t.searchInput} onSearch={t.setSearchInput}
        filters={filters} values={t.filters} onApply={t.setFilters} onReset={t.reset}
        onExport={() => exportCsv('students', columnsToCsv(columns), d?.items || [])} />

      <DataTable
        columns={columns} rows={d?.items} getRowId={(s) => s.studentId} loading={query.isLoading} error={metaError || query.error}
        sort={t.sort} onSort={t.onSort} caption="Students"
        empty={{ title: 'No students found', body: Object.values(t.filters).some(Boolean) || t.search ? 'No student matches this search or filter.' : admin ? 'Add a student, or import a master list.' : 'No students are assigned to you yet.' }}
        selection={admin ? { selected, onChange: setSelected, actions: (ids) => <button className="font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'bulk', ids })}>Assign to a teacher</button> } : null}
        pagination={d && { page: d.page, pages: d.pages, total: d.total, onPage: t.setPage }} unit="student"
        rowActions={(s) => (<>
          <button className="font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'view', id: s.studentId })}>View</button>
          {admin && <>
            <button className="ml-3 font-semibold text-amber-600 underline" onClick={() => setModal({ type: 'form', student: s })}>Edit</button>
            <button className="ml-3 font-semibold text-red-700 underline" onClick={() => { del.reset(); setModal({ type: 'delete', student: s }); }}>Delete</button>
          </>}
        </>)} />

      {modal?.type === 'form' && meta && (
        <StudentForm student={modal.student} meta={meta} onClose={() => setModal(null)}
          onSaved={(r) => setModal(r.tempPassword ? { type: 'password', email: r.student.loginEmail, password: r.tempPassword } : null)} />)}
      {modal?.type === 'view' && <StudentDetail id={modal.id} meta={meta} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && (
        <ConfirmDialog title="Delete student?" confirmLabel="Delete" busy={del.isPending} error={del.error}
          text={`Delete ${modal.student.firstName} ${modal.student.lastName} (${modal.student.studentId})? Their login is disabled. This cannot be undone.`}
          onCancel={() => setModal(null)} onConfirm={() => del.mutate({ id: modal.student.studentId }, { onSuccess: () => setModal(null) })} />)}
      {modal?.type === 'bulk' && meta && (
        <BulkAssign ids={modal.ids} teachers={meta.teachers} busy={assign.isPending} error={assign.error}
          onCancel={() => setModal(null)} onDone={(teacherId) => assign.mutate({ teacherId, studentIds: modal.ids }, { onSuccess: () => { setSelected([]); setModal(null); } })} />)}
      {modal?.type === 'password' && (
        <Modal title="Student login created" onClose={() => setModal(null)}>
          <p className="text-sm">Give these details to the student. The password is shown only once.</p>
          <dl className="mt-3 rounded bg-forest-100/60 p-3 text-sm"><dt className="text-forest-700">Email</dt><dd className="font-mono">{modal.email}</dd>
            <dt className="mt-2 text-forest-700">Temporary password</dt><dd className="font-mono">{modal.password}</dd></dl>
          <div className="mt-4 flex gap-3">
            <button className={`flex-1 ${btnGhost}`} onClick={() => navigator.clipboard?.writeText(`${modal.email} / ${modal.password}`)}>Copy</button>
            <button className={`flex-1 ${btnPrimary}`} onClick={() => setModal(null)}>Done</button>
          </div>
        </Modal>)}
    </>
  );
}

function BulkAssign({ ids, teachers, busy, error, onCancel, onDone }) {
  const [teacherId, setTeacherId] = useState('');
  return (
    <Modal title={`Assign ${ids.length} student(s) to a teacher`} onClose={onCancel}>
      <label className="block text-sm font-medium">Teacher
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="mt-1 w-full rounded border border-forest-100 px-3 py-2 text-sm">
          <option value="">Select</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="mt-3 rounded bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      <div className="mt-4 flex gap-3">
        <button className={`flex-1 ${btnGhost}`} onClick={onCancel}>Cancel</button>
        <button className={`flex-1 ${btnPrimary}`} disabled={!teacherId || busy} onClick={() => onDone(teacherId)}>{busy ? 'Assigning...' : 'Assign'}</button>
      </div>
    </Modal>
  );
}
