import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { BrandLogo } from '../components/AppShell';
import { useAuthStore } from '../store/authStore';
import { useBranding, logoDataUri } from '../hooks/useShell';
import { HOME } from '../config/nav';

/** A logo sits on a white chip so a dark or coloured school seal stays legible on the deep teal. */
function LogoChip({ src, alt, fallback }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white p-1.5 shadow-soft">
      {src ? <img src={src} alt={alt} className="max-h-full max-w-full object-contain" /> : fallback}
    </span>
  );
}

export default function Login() {
  const { login, status, error, user } = useAuthStore();
  const { branding } = useBranding();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const from = useLocation().state?.from?.pathname;
  const school = logoDataUri(branding.schoolLogo);
  const division = logoDataUri(branding.divisionLogo);

  if (status === 'authenticated' && user) return <Navigate to={HOME[user.role]} replace />;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(userId, password);
      navigate(from && from.startsWith(HOME[u.role]) ? from : HOME[u.role], { replace: true });
    } catch { /* the store holds the message */ }
  };
  const busy = status === 'loading';
  const input = 'w-full rounded-lg border border-forest-100 bg-white px-3 py-2.5 text-sm placeholder:text-forest-700/50';

  return (
    <div className="grid min-h-screen bg-paper md:grid-cols-[minmax(0,1fr)_minmax(400px,0.9fr)]">
      {/* Brand panel */}
      <div className="relative hidden flex-col overflow-hidden bg-nav p-10 text-white md:flex">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-nav-deep" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.05]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/[0.04]" />

        <div className="relative flex items-center gap-3">
          <LogoChip src={school} alt={`${branding.schoolName} logo`} fallback={<BrandLogo branding={branding} size={44} />} />
          {division && <LogoChip src={division} alt={`${branding.divisionName || 'Division'} logo`} />}
        </div>

        <div className="relative my-auto max-w-xl py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-nav-soft">Senior High School</p>
          <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.1] lg:text-[2.75rem]">{branding.schoolName}</h1>
          <div aria-hidden="true" className="my-5 h-1 w-16 rounded-full bg-amber-500" />
          <p className="text-lg font-medium text-white/90">{branding.systemName}</p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-nav-soft">
            Track work immersion hours, daily journals and supervisor evaluations in one place, from deployment through to completion.
          </p>
          {branding.divisionName && (
            <p className="mt-6 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">{branding.divisionName}</p>)}
        </div>

        <p className="relative text-xs text-nav-soft">&copy; {new Date().getFullYear()} {branding.schoolName}</p>
      </div>

      {/* Form */}
      <div className="flex min-w-0 items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          {/* The brand repeats here for phones, where the panel above is hidden */}
          <div className="mb-7 flex items-center gap-3 md:hidden">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white p-1.5 shadow-soft ring-1 ring-forest-100">
              {school ? <img src={school} alt="" className="max-h-full max-w-full object-contain" /> : <BrandLogo branding={branding} size={38} />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{branding.schoolName}</p>
              <p className="truncate text-xs text-forest-700">{branding.systemName}</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-forest-700">Use the school account given to you.</p>

          {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <label className="mb-1.5 block text-sm font-medium" htmlFor="userid">Username</label>
          {/* Not type="email": a username here is a reference ID such as STU-2026-0001, which the
              browser would otherwise refuse to submit. Staff accounts may still type their email. */}
          <input id="userid" type="text" required autoComplete="username" autoCapitalize="none" spellCheck="false"
            placeholder="STU-2026-0001" value={userId} onChange={(e) => setUserId(e.target.value)} className={`mb-1 ${input}`} />
          <p className="mb-4 text-xs text-forest-700">Your Student ID, Employee Number or school email.</p>

          <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
          <div className="relative mb-6">
            <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} className={`${input} pr-11`} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-forest-700 hover:bg-forest-100/70">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 font-semibold text-forest-900 hover:bg-amber-600 disabled:opacity-60">
            <LogIn size={17} aria-hidden="true" />{busy ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="mt-6 text-center text-xs leading-relaxed text-forest-700">
            Your password is the same as your username unless you have changed it. Forgotten it? Ask your work immersion
            teacher or the system administrator to reset it for you.
          </p>
        </form>
      </div>
    </div>
  );
}
