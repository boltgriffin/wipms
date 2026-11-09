import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rosterService as api } from '../services/rosterService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useTeachers = (f) => useQuery({ queryKey: ['teachers', f], queryFn: () => api.get(tok(), '/teachers/list', clean(f)), placeholderData: keepPreviousData });
export const useTeacher = (id) => useQuery({ queryKey: ['teacher', id], queryFn: () => api.get(tok(), '/teachers/get', { id }), enabled: !!id });
export const useWorkload = () => useQuery({ queryKey: ['workload'], queryFn: () => api.get(tok(), '/teachers/workload'), staleTime: 0 });
export const useImportLogs = (f) => useQuery({ queryKey: ['import', 'logs', f], queryFn: () => api.get(tok(), '/import/logs', clean(f)), placeholderData: keepPreviousData });
export const useImportLog = (id, f) => useQuery({ queryKey: ['import', 'log', id, f], queryFn: () => api.get(tok(), '/import/log', { id, ...clean(f) }), enabled: !!id });
/** The lists the teacher import offers as defaults, fetched only while that tab is open. */
export const useTeacherImportMeta = (enabled) => useQuery({
  queryKey: ['import', 'teacher-meta'], queryFn: () => api.get(tok(), '/import/teachers/meta'),
  enabled: enabled !== false, staleTime: 10 * 60 * 1000
});

export function useRosterAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['teachers', 'teacher', 'workload', 'students', 'meta', 'import'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
