import { Building2, CheckCircle2, CircleSlash, Clock, DoorOpen, Hourglass, PlayCircle, UserMinus } from 'lucide-react';

/* ---------- The vocabulary of Milestone 11, in one place ---------- */
export const DEP_META = {
  UNASSIGNED: { label: 'Unassigned', tone: 'bg-gray-100 text-gray-700', icon: UserMinus, note: 'No placement yet' },
  WAITLISTED: { label: 'Waitlisted', tone: 'bg-amber-100 text-amber-900', icon: Hourglass, note: 'Waiting for a slot to open' },
  AUTO_ASSIGNED: { label: 'Auto assigned', tone: 'bg-blue-100 text-blue-800', icon: Building2, note: 'Placed by the assignment run' },
  ADMIN_ASSIGNED: { label: 'Admin assigned', tone: 'bg-blue-100 text-blue-800', icon: Building2, note: 'Placed by an administrator' },
  SCHEDULED: { label: 'Scheduled', tone: 'bg-violet-100 text-violet-800', icon: Clock, note: 'In a deployment batch' },
  DEPLOYED: { label: 'Deployed', tone: 'bg-teal-100 text-teal-900', icon: PlayCircle, note: 'Reported to the institution' },
  ACTIVE: { label: 'Active', tone: 'bg-green-100 text-green-800', icon: PlayCircle, note: 'Rendering hours' },
  COMPLETED: { label: 'Completed', tone: 'bg-green-100 text-green-800', icon: CheckCircle2, note: 'Required hours complete' }
};
export const INST_META = {
  OPEN: { label: 'Open', tone: 'bg-green-100 text-green-800', icon: DoorOpen },
  FULL: { label: 'Full', tone: 'bg-amber-100 text-amber-900', icon: Building2 },
  CLOSED: { label: 'Closed', tone: 'bg-gray-200 text-gray-700', icon: CircleSlash }
};
export const BATCH_META = {
  PLANNED: { label: 'Planned', tone: 'bg-gray-100 text-gray-700' },
  ACTIVE: { label: 'Active', tone: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Closed', tone: 'bg-gray-200 text-gray-700' }
};
export const ASSIGN_TYPE_LABEL = { AUTO_ASSIGNED: 'Auto', ADMIN_ASSIGNED: 'By admin', ADMIN_TRANSFERRED: 'Transferred' };

const Chip = ({ tone, title, children }) => (
  <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>
);
export function DeployTag({ status }) {
  const m = DEP_META[status];
  if (!m) return <span className="text-xs text-forest-700">&mdash;</span>;
  const Icon = m.icon;
  return <Chip tone={m.tone} title={m.note}><Icon size={12} aria-hidden="true" />{m.label}</Chip>;
}
export function InstTag({ status }) {
  const m = INST_META[status] || INST_META.OPEN;
  const Icon = m.icon;
  return <Chip tone={m.tone}><Icon size={12} aria-hidden="true" />{m.label}</Chip>;
}
export const BatchTag = ({ status }) => {
  const m = BATCH_META[status] || BATCH_META.PLANNED;
  return <Chip tone={m.tone}>{m.label}</Chip>;
};

/** A capacity read as the spec writes it: original + extra = total, minus assigned = available. */
export function SlotBar({ inst }) {
  const total = inst.totalCapacity || 0, used = inst.assignedStudents || 0;
  const pct = total ? Math.min(100, Math.round(used / total * 100)) : 0;
  const tone = inst.status === 'CLOSED' ? 'bg-gray-400' : inst.availableSlots === 0 ? 'bg-amber-500' : 'bg-brand';
  return (
    <div className="min-w-[120px]">
      <div className="h-2 w-full overflow-hidden rounded-full bg-forest-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`${used} of ${total} slots used`}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-forest-700">
        {used} / {total} used
        {inst.additionalSlots > 0 && <span className="ml-1">({inst.originalCapacity}+{inst.additionalSlots})</span>}
      </p>
    </div>
  );
}

/** A dashboard counter. `tone` carries meaning: amber is a queue someone has to clear. */
export function StatTile({ label, value, hint, tone = 'bg-paper', icon: Icon }) {
  return (
    <div className={`rounded-xl border border-forest-100 p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-forest-700">{label}</p>
        {Icon && <Icon size={16} aria-hidden="true" className="shrink-0 text-forest-700" />}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-forest-700">{hint}</p>}
    </div>
  );
}
