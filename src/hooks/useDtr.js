import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dtrService as api } from '../services/dtrService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;

/** Today's state decides which single button is shown, so it is kept fresh but never polled hard. */
export const useDtrToday = () => useQuery({ queryKey: ['dtr', 'today'], queryFn: () => api.today(tok()), staleTime: 15 * 1000 });
export const useMyDtr = () => useQuery({ queryKey: ['dtr', 'mine'], queryFn: () => api.mine(tok()), staleTime: 30 * 1000 });
export const useCorrections = (params) => useQuery({ queryKey: ['dtr', 'corrections', params], queryFn: () => api.corrections(tok(), params), staleTime: 30 * 1000 });
export const useLeaderPanel = (enabled) => useQuery({ queryKey: ['dtr', 'leader-panel'], queryFn: () => api.leaderPanel(tok()), enabled: enabled !== false, retry: false, staleTime: 15 * 1000 });
/** One month on Civil Service Form No. 48. studentId is omitted for a student looking at their own. */
export const useCsForm = (month, studentId) => useQuery({
  queryKey: ['dtr', 'csform', month || 'latest', studentId || 'me'],
  queryFn: () => api.csform(tok(), studentId ? { month, studentId } : { month }),
  staleTime: 30 * 1000, keepPreviousData: true // changing month must not blank the form
});
export const useDtrOverview = (params) => useQuery({ queryKey: ['dtr', 'overview', params], queryFn: () => api.overview(tok(), params), staleTime: 30 * 1000 });
export const useStudentDtr = (studentId) => useQuery({ queryKey: ['dtr', 'student', studentId], queryFn: () => api.student(tok(), studentId), enabled: !!studentId });
export const useDtrSettings = () => useQuery({ queryKey: ['dtr', 'settings'], queryFn: () => api.settings(tok()), staleTime: 10 * 60 * 1000 });

/**
 * Every DTR write can move the hours, the lock and the teacher's queue at once, so one mutation hook
 * clears the whole 'dtr' tree plus the dashboards that quote the same figures.
 */
export function useDtrAction(kind) {
  const qc = useQueryClient();
  const fn = {
    correction: api.requestCorrection, review: api.reviewCorrection, leaderRecord: api.leaderRecord,
    approve: api.approve, regenerate: api.regenerate, settings: api.saveSettings
  }[kind];
  return useMutation({
    mutationFn: (data) => fn(tok(), data),
    onSuccess: () => {
      ['dtr', 'attendance', 'analytics', 'completion', 'notifications'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
  });
}
