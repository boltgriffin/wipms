import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, CalendarRange, CheckCircle2, DoorOpen, Hourglass, Layers, PlayCircle,
  Shuffle, Sparkles, Upload, UserMinus, Users
} from 'lucide-react';
import { PageHeader, btnGhost, btnPrimary } from '../components/datatable';
import { ErrorBanner, Modal } from '../components/ui';
import { DeployTag, StatTile } from '../components/deployUi';
import { useAssignPreview, useDeployAction, useDeployDashboard } from '../hooks/useDeploy';

/**
 * The dry run. Nothing is written until the administrator says so, because placing five hundred
 * students is not something to discover you disagree with afterwards.
 */
function PreviewModal({ scope, onClose }) {
  const { data, isLoading, error } = useAssignPreview(scope, true);
  const run = useDeployAction('run');
  const [done, setDone] = useState(null);

  const s = data?.summary;
  return (
    <Modal wide title={scope === 'waitlist' ? 'Fill the waitlist' : 'Run auto assignment'} onClose={onClose}>
      {isLoading && <p className="text-sm">Working out the placement...</p>}
      {error && <ErrorBanner error={error} />}
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
            <span className="font-semibold">{done.assigned} student{done.assigned === 1 ? '' : 's'} placed.</span>{' '}
            {done.waitlisted > 0 ? `${done.waitlisted} went to the waitlist because no institution had a free slot.` : 'Nobody was left over.'}
          </p>
          <button onClick={onClose} className={btnPrimary}>Close</button>
        </div>
      ) : data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Considered" value={s.considered} />
            <StatTile label="Will be placed" value={s.assigned} tone="bg-green-50" />
            <StatTile label="Will be waitlisted" value={s.waitlisted} tone={s.waitlisted ? 'bg-amber-50' : 'bg-paper'} />
            <StatTile label="Strand matched" value={s.strandMatched} hint={`of ${s.assigned}`} />
          </div>
          <p className="text-sm text-forest-700">
            {s.slotsBefore} slot{s.slotsBefore === 1 ? '' : 's'} free before, {s.slotsAfter} after.
            Institutions are ranked by strand match first, then how near they are, then how much room they have.
          </p>

          {s.assigned > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-forest-100">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-paper text-xs uppercase tracking-wide text-forest-700">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Student</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Strand</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Institution</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Why</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-100">
                  {data.assign.map((a) => (
                    <tr key={a.studentId}>
                      <td className="px-3 py-1.5">{a.name}</td>
                      <td className="px-3 py-1.5">{a.strand || '—'}</td>
                      <td className="px-3 py-1.5">{a.institution}</td>
                      <td className="px-3 py-1.5 text-xs text-forest-700">{a.why}{a.metres != null ? ` · ${a.metres} m` : ''}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
          {data.truncated && <p className="text-xs text-forest-700">Showing the first 300. All of them will be placed.</p>}

          {s.waitlisted > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm">
              <span className="font-semibold">{s.waitlisted} student{s.waitlisted === 1 ? '' : 's'} cannot be placed yet.</span>{' '}
              They go on the waitlist and are picked up automatically the moment you add slots anywhere.
            </p>)}

          <ErrorBanner error={run.error} />
          <div className="flex flex-wrap gap-3">
            <button onClick={onClose} className={btnGhost}>Cancel</button>
            <button disabled={run.isPending || !s.considered} className={btnPrimary}
              onClick={() => run.mutate({ scope }, { onSuccess: (r) => setDone(r.summary) })}>
              {run.isPending ? 'Placing...' : `Place ${s.assigned} student${s.assigned === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>)}
    </Modal>
  );
}

export default function DeploymentDashboard() {
  const { data, isLoading, error } = useDeployDashboard();
  const [preview, setPreview] = useState(null);

  if (isLoading) return <p className="text-sm">Loading the deployment picture...</p>;
  if (error) return <ErrorBanner error={error} />;

  const st = data.students, inst = data.institutions, pr = data.progress;
  const action = 'inline-flex items-center gap-2';

  return (
    <>
      <PageHeader title="Deployment" subtitle={`${data.track} track · placements, capacities and batches. Only an administrator can change any of this.`} />

      {/* What needs doing, before what has been done */}
      {(st.waitlisted > 0 || st.unassigned > 0 || st.noAddress > 0 || st.noStrand > 0) && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide">Needs attention</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {st.unassigned > 0 && <li><Link to="/admin/placements?status=UNASSIGNED" className="font-semibold underline">{st.unassigned} student{st.unassigned === 1 ? '' : 's'} with no placement</Link> — run auto assignment.</li>}
            {st.waitlisted > 0 && <li><Link to="/admin/placements?status=WAITLISTED" className="font-semibold underline">{st.waitlisted} waitlisted</Link> — {inst.availableSlots > 0 ? `${inst.availableSlots} slots are free; fill the waitlist.` : 'add slots to place them.'}</li>}
            {st.noStrand > 0 && <li>{st.noStrand} student{st.noStrand === 1 ? '' : 's'} have no strand set, so they cannot be matched to a suitable institution.</li>}
            {st.noAddress > 0 && <li>{st.noAddress} student{st.noAddress === 1 ? '' : 's'} have no address, so nearness cannot be judged for them.</li>}
          </ul>
        </div>)}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total students" value={st.total} icon={Users} />
        <StatTile label="Assigned" value={st.assigned} hint={`${pr.placementPct}% placed`} tone="bg-green-50" icon={Building2} />
        <StatTile label="Waitlisted" value={st.waitlisted} tone={st.waitlisted ? 'bg-amber-50' : 'bg-paper'} icon={Hourglass} />
        <StatTile label="Unassigned" value={st.unassigned} icon={UserMinus} />
        <StatTile label="Open institutions" value={inst.open} hint={`${inst.full} full · ${inst.closed} closed`} icon={DoorOpen} />
        <StatTile label="Available slots" value={inst.availableSlots} hint={`of ${inst.totalCapacity} total capacity`} icon={Layers} />
        <StatTile label="Active deployments" value={pr.activeDeployments} hint={`${st.scheduled} scheduled`} icon={PlayCircle} />
        <StatTile label="Completed" value={st.completed} hint={`${pr.completionPct}% of students`} tone="bg-green-50" icon={CheckCircle2} />
      </div>

      <section className="mb-5 rounded-xl border border-forest-100 bg-white p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/import" className={`${btnGhost} ${action}`}><Upload size={15} aria-hidden="true" />Import students</Link>
          <button onClick={() => setPreview('all')} className={`${btnPrimary} ${action}`}><Sparkles size={15} aria-hidden="true" />Run auto assignment</button>
          <button onClick={() => setPreview('waitlist')} disabled={!st.waitlisted} className={`${btnGhost} ${action}`}><Hourglass size={15} aria-hidden="true" />Fill waitlist</button>
          <Link to="/admin/capacities" className={`${btnGhost} ${action}`}><Layers size={15} aria-hidden="true" />Manage capacities</Link>
          <Link to="/admin/batches" className={`${btnGhost} ${action}`}><CalendarRange size={15} aria-hidden="true" />Deployment batches</Link>
          <Link to="/admin/placements" className={`${btnGhost} ${action}`}><Shuffle size={15} aria-hidden="true" />Placements and transfers</Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">Where everyone stands</h2>
          <ul className="space-y-2">
            {['UNASSIGNED', 'WAITLISTED', 'AUTO_ASSIGNED', 'ADMIN_ASSIGNED', 'SCHEDULED', 'DEPLOYED', 'ACTIVE', 'COMPLETED'].map((k) => {
              const n = { UNASSIGNED: st.unassigned, WAITLISTED: st.waitlisted, AUTO_ASSIGNED: 0, ADMIN_ASSIGNED: 0,
                SCHEDULED: st.scheduled, DEPLOYED: st.deployed, ACTIVE: st.active, COMPLETED: st.completed }[k];
              if (k === 'AUTO_ASSIGNED' || k === 'ADMIN_ASSIGNED') return null;
              return (
                <li key={k} className="flex items-center justify-between gap-3 text-sm">
                  <DeployTag status={k} />
                  <span className="font-semibold">{n}</span>
                </li>);
            })}
          </ul>
          <p className="mt-3 text-xs text-forest-700">
            Deployed, active and completed are not set by hand: the first attendance deploys a student, a second day makes them
            active, and the required hours complete them.
          </p>
        </section>

        <section className="rounded-xl border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-forest-700">By strand</h2>
          <ul className="space-y-3">
            {data.strands.map((s) => (
              <li key={s.code}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">{s.code} <span className="font-normal text-forest-700">{s.label}</span></p>
                  <p className="text-sm">{s.assigned} / {s.total}</p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${s.total ? Math.round(s.assigned / s.total * 100) : 0}%` }} />
                </div>
              </li>))}
          </ul>
          {data.batches.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-forest-700">Batches</h3>
              <ul className="space-y-1.5 text-sm">
                {data.batches.slice(0, 5).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <span>{b.name} <span className="text-xs text-forest-700">{b.startDate} to {b.endDate}</span></span>
                    <span className="font-semibold">{b.students}</span>
                  </li>))}
              </ul>
            </>)}
        </section>
      </div>

      {preview && <PreviewModal scope={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
