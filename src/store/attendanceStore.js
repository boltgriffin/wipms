import { create } from 'zustand';
import { attendanceService as api } from '../services/attendanceService';
import { useAuthStore } from './authStore';

export const useAttendanceStore = create((set, get) => {
  const run = async (key, fn) => {
    set({ loading: true, error: null });
    try {
      const d = await fn(useAuthStore.getState().token);
      if (key) set({ [key]: d });
      set({ loading: false });
      return d;
    } catch (e) {
      if (e.code === 'UNAUTHORIZED') useAuthStore.setState({ token: null, user: null, stats: null, status: 'unauthenticated' });
      set({ loading: false, error: e.message, errorCode: e.code });
      throw e;
    }
  };
  return {
    loading: false, error: null, errorCode: null,
    mine: null, today: null, students: null, detail: null, analytics: null, report: null,
    loadMine: () => run('mine', (t) => api.mine(t)).catch(() => {}),
    loadToday: () => run('today', (t) => api.today(t)).catch(() => {}),
    gpsCheck: (fix) => run(null, (t) => api.gpsCheck(t, fix)),
    scan: (payload) => run(null, (t) => api.scan(t, payload)),
    submit: async (form) => { await run(null, (t) => api.submit(t, form)); await get().loadMine(); },
    loadStudents: () => run('students', (t) => api.students(t)).catch(() => {}),
    loadDetail: (id) => run('detail', (t) => api.student(t, id)).catch(() => {}),
    setHours: async (id, hours) => { await run(null, (t) => api.setHours(t, id, hours)); await get().loadDetail(id); },
    loadAnalytics: () => run('analytics', (t) => api.analytics(t)).catch(() => {}),
    loadReport: (params) => run('report', (t) => api.report(t, params)).catch(() => {})
  };
});
