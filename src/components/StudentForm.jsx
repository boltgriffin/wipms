import { useState } from 'react';
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from './ui';
import { useStudentAction } from '../hooks/useManagement';

const phone = (v) => { let s = String(v || '').replace(/[\s-]/g, ''); if (/^\+63/.test(s)) s = '0' + s.slice(3); else if (/^63/.test(s)) s = '0' + s.slice(2); return s; };
const BLANK = { studentId: '', lrn: '', firstName: '', lastName: '', sex: '', contactNumber: '', parentName: '', parentContact: '', gradeLevel: '', strand: '', section: '', teacherId: '', status: 'ACTIVE', loginEmail: '' };

function validate(f) {
  const e = {};
  const need = (k, m) => { if (!String(f[k] ?? '').trim()) e[k] = m; };
  need('firstName', 'First name is required'); need('lastName', 'Last name is required'); need('parentName', 'Parent name is required');
  need('section', 'Section is required'); need('sex', 'Choose a sex'); need('strand', 'Choose a strand'); need('gradeLevel', 'Choose a grade level');
  if (!/^\d{12}$/.test(String(f.lrn).replace(/\s/g, ''))) e.lrn = 'LRN must be exactly 12 digits';
  if (f.contactNumber && !/^09\d{9}$/.test(phone(f.contactNumber))) e.contactNumber = 'Use a mobile number like 09123456789';
  if (!/^09\d{9}$/.test(phone(f.parentContact))) e.parentContact = 'Use a mobile number like 09123456789';
  if (f.loginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.loginEmail)) e.loginEmail = 'Enter a valid email';
  return e;
}

export default function StudentForm({ student, meta, onClose, onSaved }) {
  const edit = !!student;
  const mut = useStudentAction(edit ? 'update' : 'create');
  const [f, setF] = useState({ ...BLANK, ...(student || {}), gradeLevel: student ? String(student.gradeLevel) : '' });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); if (errs[k]) setErrs({ ...errs, [k]: undefined }); };
  const submit = (e) => {
    e.preventDefault();
    const v = validate(f); setErrs(v);
    if (Object.keys(v).length) return;
    mut.mutate({ ...f, id: student?.studentId, gradeLevel: Number(f.gradeLevel) }, { onSuccess: onSaved, onError: (err) => setErrs(err.fields || {}) });
  };
  const text = (k, label, extra = {}, props = {}) => (
    <Field label={label} error={errs[k]} hint={extra.hint}><input className={`mt-1 ${inputCls}`} value={f[k] ?? ''} onChange={set(k)} {...props} /></Field>
  );
  const select = (k, label, options, blank = 'Select') => (
    <Field label={label} error={errs[k]}>
      <select className={`mt-1 ${inputCls}`} value={f[k] ?? ''} onChange={set(k)}>
        {blank && <option value="">{blank}</option>}
        {options.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.t ?? o}</option>)}
      </select>
    </Field>
  );
  return (
    <Modal title={edit ? 'Edit student' : 'Add student'} onClose={onClose} wide>
      <form onSubmit={submit} noValidate>
        {mut.error && !mut.error.fields && <ErrorBanner error={mut.error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('studentId', 'Student ID', { hint: edit ? undefined : 'Leave blank to generate one' }, { disabled: edit, maxLength: 20 })}
          {text('lrn', 'LRN', { hint: '12 digits' }, { inputMode: 'numeric', maxLength: 12 })}
          {text('firstName', 'First name', {}, { maxLength: 60 })}
          {text('lastName', 'Last name', {}, { maxLength: 60 })}
          {select('sex', 'Sex', meta.sexes)}
          {text('contactNumber', 'Contact number', { hint: 'Optional, e.g. 09123456789' }, { inputMode: 'tel' })}
          {text('parentName', 'Parent / guardian name', {}, { maxLength: 80 })}
          {text('parentContact', 'Parent contact number', {}, { inputMode: 'tel' })}
          {select('gradeLevel', 'Grade level', meta.grades.map((g) => ({ v: String(g), t: `Grade ${g}` })))}
          {select('strand', 'Strand', meta.strands)}
          {text('section', 'Section', {}, { maxLength: 30 })}
          {select('teacherId', 'Assigned teacher', meta.teachers.map((t) => ({ v: t.id, t: t.name })), 'Unassigned')}
          {select('status', 'Status', meta.statuses, null)}
          {!student?.hasAccount && text('loginEmail', 'Login email', { hint: 'Optional. Creates or links a student login for attendance.' }, { type: 'email' })}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button disabled={mut.isPending} className={btnPrimary}>{mut.isPending ? 'Saving...' : edit ? 'Save changes' : 'Create student'}</button>
        </div>
      </form>
    </Modal>
  );
}
