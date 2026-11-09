import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { managementService as api } from '../services/managementService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== null && v !== undefined));

export const useMeta = () => useQuery({ queryKey: ['meta'], queryFn: () => api.meta(tok()), staleTime: 300000 });
export const useStudents = (f) => useQuery({ queryKey: ['students', f], queryFn: () => api.students(tok(), clean(f)), placeholderData: keepPreviousData });
export const useStudent = (id) => useQuery({ queryKey: ['student', id], queryFn: () => api.student(tok(), id), enabled: !!id });
export const useInstitutions = (f) => useQuery({ queryKey: ['institutions', f], queryFn: () => api.institutions(tok(), clean(f)), placeholderData: keepPreviousData });

function useAct(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => ['students', 'student', 'institutions', 'meta'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
export const useStudentAction = (name) => useAct((data) => api.studentAction(tok(), name, data));
export const useInstitutionAction = (name) => useAct((data) => api.institutionAction(tok(), name, data));
