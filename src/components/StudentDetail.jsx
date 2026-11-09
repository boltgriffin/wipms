import { useState } from 'react';
import { ConfirmDialog, ErrorBanner, Modal, StatusPill, btnPrimary, btnGhost, inputCls } from './ui';
import { useStudent, useStudentAction } from '../hooks/useManagement';

const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-forest-700">{k}</dt><dd className="text-right font-medium">{v || '-'}</dd></div>;

export default function StudentDetail({ id, meta, onClose }) {
  const { data, error, isLoading } = useStudent(id);
  const assign = useStudentAction('assign');
  const unassign = useStudentAction('unassign');
  const [inst, setInst] = useState('');
  const [confirm, setConfirm] = useState(false);
  const s = data?.student;
  const options = (meta?.institutions || []).filter((i) => i.id !== s?.institutionId);
  return (
    <Modal title="Student details" onClose={onClose} wide>
      {isLoading && <p className="text-sm">Loading...</p>}
      <ErrorBanner error={error || assign.error || unassign.error} />
      {s && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-lg font-bold">{s.firstName} {s.lastName}</p><StatusPill status={s.status} />
          </div>
          <dl className="grid gap-x-8 divide-y divide-forest-100 sm:grid-cols-2 sm:divide-y-0">
            <div className="divide-y divide-forest-100">
              <Row k="Student ID" v={s.studentId} /><Row k="LRN" v={s.lrn} /><Row k="Sex" v={s.sex} /><Row k="Contact number" v={s.contactNumber} />
              <Row k="Parent / guardian" v={s.parentName} /><Row k="Parent contact" v={s.parentContact} />
            </div>
            <div className="divide-y divide-forest-100">
              <Row k="Grade level" v={`Grade ${s.gradeLevel}`} /><Row k="Strand" v={s.strand} /><Row k="Section" v={s.section} />
              <Row k="Assigned teacher" v={s.teacherName} /><Row k="Login account" v={s.hasAccount ? s.loginEmail || 'Yes' : 'None'} />
              <Row k="Institution" v={s.institutionName || 'Not assigned'} />
            </div>
          </dl>
          <div className="mt-5 rounded border border-forest-100 p-4">
            <h3 className="mb-3 text-sm font-bold">Institution assignment</h3>
            <div className="flex flex-wrap items-end gap-3">
              <select aria-label="Institution" value={inst} onChange={(e) => setInst(e.target.value)} className={`${inputCls} max-w-xs`}>
                <option value="">Choose institution</option>
                {options.map((i) => <option key={i.id} value={i.id} disabled={i.remaining <= 0}>{i.name} ({i.remaining} slots left)</option>)}
              </select>
              <button disabled={!inst || assign.isPending || s.status !== 'ACTIVE'} className={btnPrimary}
                onClick={() => assign.mutate({ studentId: s.studentId, institutionId: inst }, { onSuccess: () => setInst('') })}>
                {assign.isPending ? 'Assigning...' : s.institutionId ? 'Reassign' : 'Assign'}
              </button>
              {s.institutionId && <button className={btnGhost} onClick={() => setConfirm(true)}>Remove assignment</button>}
            </div>
            {s.status !== 'ACTIVE' && <p className="mt-2 text-xs text-forest-700">Only active students can be assigned.</p>}
          </div>
        </>
      )}
      {confirm && (
        <ConfirmDialog title="Remove assignment?" text={`${s.firstName} will no longer be assigned to ${s.institutionName}. They will not be able to record GPS attendance until reassigned.`}
          confirmLabel="Remove" busy={unassign.isPending} error={unassign.error} onCancel={() => setConfirm(false)}
          onConfirm={() => unassign.mutate({ studentId: s.studentId }, { onSuccess: () => setConfirm(false) })} />
      )}
    </Modal>
  );
}
