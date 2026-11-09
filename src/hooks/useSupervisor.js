import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supervisorService as api } from '../services/supervisorService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useSupOverview = () => useQuery({ queryKey: ['sup', 'overview'], queryFn: () => api.get(tok(), '/supervisor/overview'), staleTime: 0 });
export const useSupStudents = (f) => useQuery({ queryKey: ['sup', 'students', f], queryFn: () => api.get(tok(), '/supervisor/students', clean(f)), placeholderData: keepPreviousData });
export const useSupStudent = (id) => useQuery({ queryKey: ['sup', 'student', id], queryFn: () => api.get(tok(), '/supervisor/student', { id }), enabled: !!id, staleTime: 0 });
export const useSupEvaluations = (f) => useQuery({ queryKey: ['sup', 'evaluations', f], queryFn: () => api.get(tok(), '/supervisor/evaluations', clean(f)), placeholderData: keepPreviousData });
export const useSupervisorsList = () => useQuery({ queryKey: ['supervisors'], queryFn: () => api.get(tok(), '/supervisors/list') });
export const useEvalStudents = () => useQuery({ queryKey: ['evals', 'students'], queryFn: () => api.get(tok(), '/evaluations/students') });
export const useEvalStudent = (id) => useQuery({ queryKey: ['evals', 'student', id], queryFn: () => api.get(tok(), '/evaluations/student', { id }), enabled: !!id });
export const useMyEvaluations = () => useQuery({ queryKey: ['evals', 'mine'], queryFn: () => api.get(tok(), '/evaluations/mine') });

// path examples: /supervisor/evaluation/save, /supervisor/attendance/verify, /supervisors/create
export function useAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['sup', 'supervisors', 'evals'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
