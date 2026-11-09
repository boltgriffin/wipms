import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { clearCaches, getUser, putUser } from '../offline/cache';

const CLEARED = { token: null, user: null, stats: null, status: 'unauthenticated', offline: false };

export const useAuthStore = create(persist((set, get) => ({
  token: null, user: null, stats: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  offline: false, // signed in from the device's own copy, because the server could not be reached
  error: null,

  login: async (username, password) => {
    set({ status: 'loading', error: null });
    try {
      const d = await authService.login(username, password);
      set({ token: d.token, user: d.user, stats: d.stats, status: 'authenticated', offline: false });
      putUser(d.token, d.user, d.stats);  // so the next launch can open without a connection
      return d.user;
    } catch (e) {
      set({ status: 'unauthenticated', error: e.message });
      throw e;
    }
  },

  /**
   * Validates the persisted token on app start.
   *
   * The distinction that matters here is between a session the server has ended and a server we
   * simply cannot reach. An expired or rejected token signs the person out, as it must. A network
   * failure does not: the whole point of the installed app is that a student at a site with no
   * signal can open it and record their time in. So on a network failure the saved profile is used,
   * the session continues, and `offline` says so — the token is still checked by the server the
   * moment anything is actually sent.
   */
  hydrate: async () => {
    const token = get().token;
    if (!token) return set({ status: 'unauthenticated' });
    try {
      const d = await authService.me(token);
      set({ user: d.user, stats: d.stats, status: 'authenticated', offline: false });
      putUser(token, d.user, d.stats);
    } catch (e) {
      if (e.code === 'UNAUTHORIZED') { clearCaches(); return set(CLEARED); }
      const cached = await getUser(token).catch(() => null);
      if (cached?.user) return set({ user: cached.user, stats: cached.stats, status: 'authenticated', offline: true });
      set({ status: 'unauthenticated' });
    }
  },

  /** Called once the connection is back, to swap the cached profile for a checked one. */
  revalidate: async () => {
    if (!get().token || !get().offline) return;
    try {
      const d = await authService.me(get().token);
      set({ user: d.user, stats: d.stats, status: 'authenticated', offline: false });
      putUser(get().token, d.user, d.stats);
    } catch (e) {
      if (e.code === 'UNAUTHORIZED') { clearCaches(); set(CLEARED); }
    }
  },

  logout: async () => {
    try { await authService.logout(get().token); } catch { /* clear locally anyway */ }
    await clearCaches().catch(() => {}); // the queue is left alone: those scans are not recorded yet
    set({ ...CLEARED, error: null });
  }
}), { name: 'wipms-auth', partialize: (s) => ({ token: s.token }) }));
