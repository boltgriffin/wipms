import {
  LayoutDashboard, GraduationCap, School, Building2, MapPinned, BookOpen, Award, ShieldAlert,
  ClipboardCheck, Users, Navigation, BarChart3, Settings, Upload, ScrollText, CheckCircle2, UserCircle, CalendarClock, ClipboardList, Rocket, Layers, Shuffle, CalendarRange, Home, KeyRound,
  DatabaseBackup, RotateCcw, Trash2, FileClock
} from 'lucide-react';

export const ROLES = { ADMIN: 'ADMIN', TEACHER: 'TEACHER', STUDENT: 'STUDENT', SUPERVISOR: 'SUPERVISOR' };
export const HOME = { ADMIN: '/admin', TEACHER: '/teacher', STUDENT: '/student', SUPERVISOR: '/supervisor' };

/**
 * One navigation tree per role, in groups. `to` is the route; `match` lists extra paths that should
 * light the same item up (a detail page keeps its parent highlighted).
 */
export const NAV_GROUPS = {
  ADMIN: [
    { group: 'Main', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'Deployment', items: [
      { to: '/admin/deployment', label: 'Overview', icon: Rocket },
      { to: '/admin/placements', label: 'Placements', icon: Shuffle },
      { to: '/admin/capacities', label: 'Capacities', icon: Layers },
      { to: '/admin/batches', label: 'Batches', icon: CalendarRange }
    ] },
    { group: 'Immersion management', items: [
      { to: '/admin/students', label: 'Students', icon: GraduationCap },
      { to: '/admin/teachers', label: 'Teachers', icon: School },
      { to: '/admin/institutions', label: 'Institutions', icon: Building2 },
      { to: '/admin/gps', label: 'Attendance', icon: MapPinned },
      { to: '/admin/dtr', label: 'Daily time records', icon: CalendarClock }
    ] },
    { group: 'Student monitoring', items: [
      { to: '/admin/leaders', label: 'Student leaders', icon: Users },
      { to: '/admin/leader-reports', label: 'Observations', icon: ScrollText },
      { to: '/admin/conduct', label: 'Merits & infractions', icon: Award },
      { to: '/admin/supervisors', label: 'Supervisors', icon: ClipboardCheck }
    ] },
    { group: 'Analytics', items: [
      { to: '/admin/completion', label: 'Completion', icon: CheckCircle2 },
      { to: '/admin/completion-reports', label: 'Reports', icon: BarChart3 }
    ] },
    { group: 'System', items: [
      { to: '/admin/import', label: 'Imports', icon: Upload },
      { to: '/admin/users', label: 'Users & accounts', icon: KeyRound },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
      // Administrator-only, and only shown to administrators. The server checks the role again on
      // every call, so hiding these is a courtesy rather than the control.
      { to: '/admin/backup', label: 'Backup & restore', icon: DatabaseBackup },
      { to: '/admin/trash', label: 'Trash bin', icon: Trash2 },
      { to: '/admin/audit', label: 'Audit logs', icon: FileClock },
      { to: '/admin/reset', label: 'System reset', icon: RotateCcw }
    ] }
  ],
  TEACHER: [
    { group: 'Main', items: [{ to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'Immersion management', items: [
      { to: '/teacher/students', label: 'Students', icon: GraduationCap },
      { to: '/teacher/institutions', label: 'Institutions', icon: Building2 },
      { to: '/teacher/attendance', label: 'Attendance', icon: MapPinned, match: ['/teacher/attendance/'] },
      { to: '/teacher/dtr', label: 'Daily time records', icon: CalendarClock },
      { to: '/teacher/journals', label: 'Journals', icon: BookOpen }
    ] },
    { group: 'Student monitoring', items: [
      { to: '/teacher/leaders', label: 'Student leaders', icon: Users },
      { to: '/teacher/leader-reports', label: 'Observations', icon: ScrollText },
      { to: '/teacher/conduct', label: 'Merits & infractions', icon: Award },
      { to: '/teacher/evaluations', label: 'Evaluations', icon: ClipboardCheck }
    ] },
    { group: 'Analytics', items: [
      { to: '/teacher/completion', label: 'Completion', icon: CheckCircle2 },
      { to: '/teacher/completion-reports', label: 'Reports', icon: BarChart3 },
      { to: '/teacher/gps', label: 'GPS monitoring', icon: Navigation }
    ] }
  ],
  SUPERVISOR: [
    { group: 'Main', items: [{ to: '/supervisor', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'Student monitoring', items: [
      { to: '/supervisor/students', label: 'Assigned students', icon: GraduationCap, match: ['/supervisor/students/'] },
      { to: '/supervisor/evaluations', label: 'Evaluations', icon: ClipboardCheck }
    ] }
  ],
  STUDENT: [
    { group: 'Main', items: [{ to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    { group: 'My immersion', items: [
      { to: '/student/attendance', label: 'Attendance', icon: MapPinned },
      { to: '/student/dtr', label: 'My DTR', icon: CalendarClock },
      { to: '/student/journals', label: 'Journals', icon: BookOpen },
      { to: '/student/completion', label: 'Completion', icon: CheckCircle2 }
    ] },
    { group: 'My record', items: [
      { to: '/student/conduct', label: 'Merits & infractions', icon: Award },
      { to: '/student/evaluations', label: 'Evaluations', icon: ClipboardCheck },
      { to: '/student/leader', label: 'Student leader', icon: Users },
      { to: '/student/leader-attendance', label: 'Record for a classmate', icon: ClipboardList },
      { to: '/student/home-location', label: 'My home location', icon: Home }
    ] }
  ]
};

export const PROFILE_ICON = UserCircle;
export const ALERT_ICON = ShieldAlert;

/** Flat label lookup for breadcrumbs, including pages that are not in the sidebar. */
export const PATH_LABELS = Object.values(NAV_GROUPS).flat().reduce((acc, g) => {
  g.items.forEach((i) => { acc[i.to] = i.label; });
  return acc;
}, {
  '/admin': 'Dashboard', '/teacher': 'Dashboard', '/student': 'Dashboard', '/supervisor': 'Dashboard',
  '/unauthorized': 'No access', '/login': 'Sign in'
});
