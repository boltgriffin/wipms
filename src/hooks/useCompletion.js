import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { completionService as api } from '../services/completionService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
const PATH = { student: '/reports/student', institution: '/reports/institution', teacher: '/reports/teacher' };

export const useCompletionOverview = (f) => useQuery({ queryKey: ['completion', 'overview', f], queryFn: () => api.get(tok(), '/completion/overview', clean(f)), placeholderData: keepPreviousData, staleTime: 0 });
export const useMyCompletion = () => useQuery({ queryKey: ['completion', 'mine'], queryFn: () => api.get(tok(), '/completion/mine'), staleTime: 0 });
export const useReportMeta = () => useQuery({ queryKey: ['report', 'meta'], queryFn: () => api.get(tok(), '/reports/meta'), staleTime: 60000 });
// params === null means "not requested yet"; a report is fetched fresh each time it is generated
export const useReport = (kind, params) => useQuery({ queryKey: ['report', kind, params], queryFn: () => api.get(tok(), PATH[kind], clean(params)), enabled: params !== null, staleTime: 0, gcTime: 0 });

export function useCompletionAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['completion', 'report'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
