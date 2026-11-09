import { useEffect, useRef, useState } from 'react';
import AppLogo from './AppLogo';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, Menu, Moon, Search, Settings2, Sun, UserCircle, X } from 'lucide-react';
import { HOME, NAV_GROUPS, PATH_LABELS } from '../config/nav';
import { useIsDark, useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useBranding, useNotifications, logoDataUri } from '../hooks/useShell';

/* ---------- Logo ---------- */
export function BrandLogo({ branding, size = 36 }) {
  const src = logoDataUri(branding.schoolLogo);
  if (src) return <img src={src} alt={`${branding.schoolName} logo`} width={size} height={size} className="shrink-0 rounded-md object-contain" style={{ width: size, height: size }} />;
  // No school logo uploaded: the system's own mark, not the abbreviation in a box. An abbreviation
  // is unreadable at sidebar size and changes meaning the moment the school renames itself.
  return <AppLogo size={size} />;
}

/* ---------- Sidebar ---------- */
export function SidebarItem({ item, collapsed, onNavigate }) {
  const { pathname } = useLocation();
  const Icon = item.icon;
  const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`) || (item.match || []).some((m) => pathname.startsWith(m));
  return (
    <li>
      <NavLink to={item.to} onClick={onNavigate} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${
          active ? 'bg-white/15 text-white' : 'text-nav-soft hover:bg-white/10 hover:text-white'}`}>
        <Icon size={18} strokeWidth={2} aria-hidden="true" className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {collapsed && <span className="sr-only">{item.label}</span>}
      </NavLink>
    </li>
  );
}

export function SidebarGroup({ group, items, collapsed, onNavigate }) {
  return (
    <div className="mb-5">
      {collapsed
        ? <div className="mx-3 mb-2 border-t border-white/15" aria-hidden="true" />
        : <p className="mb-1 px-3 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-nav-soft/80">{group}</p>}
      <ul className="space-y-0.5">{items.map((i) => <SidebarItem key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />)}</ul>
    </div>
  );
}

export function Sidebar({ role, branding, collapsed, mobileOpen, onClose }) {
  const groups = NAV_GROUPS[role] || [];
  const content = (narrow) => (
    <>
      <div className={`flex items-center gap-3 px-4 py-4 ${narrow ? 'justify-center' : ''}`}>
        <BrandLogo branding={branding} size={narrow ? 32 : 38} />
        {!narrow && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-white">{branding.schoolName}</p>
            <p className="truncate text-xs leading-tight text-nav-soft">{branding.systemName}</p>
          </div>)}
      </div>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-6">
        {groups.map((g) => <SidebarGroup key={g.group} group={g.group} items={g.items} collapsed={narrow} onNavigate={onClose} />)}
      </nav>
      {!narrow && branding.divisionName && <p className="px-4 pb-4 text-[0.7rem] leading-snug text-nav-soft/85">{branding.divisionName}</p>}
    </>
  );
  return (
    <>
      {/* Desktop and tablet */}
      <aside className={`hidden shrink-0 flex-col bg-nav transition-width duration-200 md:flex ${collapsed ? 'w-[72px]' : 'w-[280px]'}`}>
        {content(collapsed)}
      </aside>
      {/* Phone drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col bg-nav shadow-panel">
            <button onClick={onClose} aria-label="Close navigation" className="absolute right-3 top-4 text-nav-soft hover:text-white"><X size={20} /></button>
            {content(false)}
          </div>
        </div>)}
    </>
  );
}

/* ---------- Breadcrumbs ---------- */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((_, i) => {
    const to = '/' + parts.slice(0, i + 1).join('/');
    const label = PATH_LABELS[to] || parts[i].replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    return { to, label };
  });
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm text-forest-700 sm:flex">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight size={14} aria-hidden="true" className="shrink-0 opacity-50" />}
          {i === crumbs.length - 1
            ? <span className="truncate font-semibold text-forest-900" aria-current="page">{c.label}</span>
            : <Link to={c.to} className="truncate hover:underline">{c.label}</Link>}
        </span>))}
    </nav>
  );
}

/* ---------- Dropdown shell ---------- */
function Dropdown({ label, icon, badge, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={label}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-forest-700 hover:bg-forest-100/70 hover:text-forest-900">
        {icon}
        {badge > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-amber-500 px-1 text-[0.65rem] font-bold leading-[18px] text-forest-900">{badge > 99 ? '99+' : badge}</span>}
      </button>
      {open && (
        <div role="menu" className={`absolute top-11 z-40 w-72 overflow-hidden rounded-xl border border-forest-100 bg-white shadow-panel ${align === 'right' ? 'right-0' : 'left-0'}`}
          onClick={() => setOpen(false)}>{children}</div>)}
    </div>
  );
}

/* ---------- Header pieces ---------- */
/**
 * Flips whatever is on screen right now. It has to compare against the resolved theme, not the stored
 * word: with the choice left on "system" on a dark device, comparing against the word set "dark" again,
 * so the first press changed nothing and the button looked dead.
 */
export function ThemeToggle() {
  const setTheme = useUiStore((s) => s.setTheme);
  const isDark = useIsDark();
  const next = isDark ? 'light' : 'dark';
  return (
    <button onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
      aria-pressed={isDark}
      className="grid h-9 w-9 place-items-center rounded-lg text-forest-700 hover:bg-forest-100/70 hover:text-forest-900">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function NotificationMenu() {
  const { data } = useNotifications();
  const items = data?.items || [];
  return (
    <Dropdown label="Notifications" icon={<Bell size={18} />} badge={items.length}>
      <div className="border-b border-forest-100 px-4 py-3"><p className="text-sm font-bold">Needs attention</p></div>
      {items.length === 0
        ? <p className="px-4 py-6 text-center text-sm text-forest-700">Nothing is waiting for you.</p>
        : <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link to={n.to} role="menuitem" className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-forest-100/50">
                  <span className="mt-0.5 min-w-[22px] rounded-full bg-amber-500 px-1.5 text-center text-xs font-bold text-forest-900">{n.count}</span>
                  <span className="min-w-0"><span className="block font-semibold">{n.label}</span><span className="block text-xs text-forest-700">{n.detail}</span></span>
                </Link>
              </li>))}
          </ul>}
    </Dropdown>
  );
}

export function ProfileMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const admin = user?.role === 'ADMIN';
  return (
    <Dropdown label="Your account" icon={<UserCircle size={20} />}>
      <div className="border-b border-forest-100 px-4 py-3">
        <p className="truncate text-sm font-bold">{user?.fullName}</p>
        <p className="truncate text-xs text-forest-700">{user?.email}</p>
        <p className="mt-1 inline-block rounded bg-forest-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide">{user?.role?.toLowerCase()}</p>
      </div>
      <ul className="py-1 text-sm">
        <li><Link to={HOME[user?.role] || '/'} role="menuitem" className="flex items-center gap-2 px-4 py-2 hover:bg-forest-100/50"><UserCircle size={16} />My profile</Link></li>
        {admin && <li><Link to="/admin/settings" role="menuitem" className="flex items-center gap-2 px-4 py-2 hover:bg-forest-100/50"><Settings2 size={16} />Preferences</Link></li>}
        <li><button role="menuitem" onClick={async () => { await logout(); navigate('/login', { replace: true }); }}
          className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-700 hover:bg-forest-100/50"><LogOut size={16} />Log out</button></li>
      </ul>
    </Dropdown>
  );
}

/** Jumps to whichever page in this role's menu matches what was typed. */
function HeaderSearch({ role }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const all = (NAV_GROUPS[role] || []).flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));
  const hits = q.trim() ? all.filter((i) => (i.label + ' ' + i.group).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];
  const go = (to) => { setQ(''); setOpen(false); navigate(to); };
  return (
    <div className="relative hidden min-w-0 flex-1 md:block">
      <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest-700" />
      <input type="search" value={q} aria-label="Search pages" placeholder="Jump to a page..." onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) go(hits[0].to); }}
        className="w-full max-w-sm rounded-lg border border-forest-100 bg-white py-2 pl-9 pr-3 text-sm" />
      {open && hits.length > 0 && (
        <ul className="absolute left-0 top-11 z-40 w-full max-w-sm overflow-hidden rounded-xl border border-forest-100 bg-white shadow-panel">
          {hits.map((h) => {
            const Icon = h.icon;
            return <li key={h.to}><button onMouseDown={() => go(h.to)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-forest-100/50">
              <Icon size={16} aria-hidden="true" />{h.label}<span className="ml-auto text-xs text-forest-700">{h.group}</span></button></li>;
          })}
        </ul>)}
    </div>
  );
}

export function Header({ onMenu, onToggle, collapsed, role }) {
  return (
    // bg-surface, not bg-white/95: Tailwind compiles an alpha-modified literal to its own class, which
    // the .dark .bg-white rule in index.css never matches, so the header stayed white in dark mode.
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-forest-100 bg-surface/95 px-4 py-2.5 backdrop-blur">
      <button onClick={onMenu} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg text-forest-700 hover:bg-forest-100/70 md:hidden"><Menu size={20} /></button>
      <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
        className="hidden h-9 w-9 place-items-center rounded-lg text-forest-700 hover:bg-forest-100/70 md:grid"><Menu size={20} /></button>
      <Breadcrumbs />
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
        <HeaderSearch role={role} />
        <NotificationMenu />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}

/* ---------- Shell ---------- */
export default function AppShell() {
  const { collapsed, toggleSidebar } = useUiStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const { branding } = useBranding();
  const { pathname } = useLocation();

  // The theme is applied by initTheme() in main.jsx, which subscribes to the store directly, so there
  // is deliberately no theme effect here: it cannot then be missed when nothing re-renders the shell.
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => { document.title = `${branding.abbreviation} - ${branding.systemName}`; }, [branding]);

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar role={role} branding={branding} collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">Skip to content</a>
        <Header onMenu={() => setMobileOpen(true)} onToggle={toggleSidebar} collapsed={collapsed} role={role} />
        <main id="main" className="flex-1 p-4 md:p-8"><Outlet /></main>
        <footer className="border-t border-forest-100 px-4 py-3 text-xs text-forest-700">
          {branding.schoolName} - {branding.systemName}{branding.divisionName ? ` - ${branding.divisionName}` : ''} &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
