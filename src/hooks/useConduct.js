import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conductService as api } from '../services/conductService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useConductMeta = () => useQuery({ queryKey: ['conduct', 'meta'], queryFn: () => api.get(tok(), '/conduct/meta'), staleTime: 60000 });
export const useConductQueue = (f) => useQuery({ queryKey: ['conduct', 'queue', f], queryFn: () => api.get(tok(), '/conduct/queue', clean(f)), placeholderData: keepPreviousData });
export const useConductRecords = (f) => useQuery({ queryKey: ['conduct', 'records', f], queryFn: () => api.get(tok(), '/conduct/records', clean(f)), placeholderData: keepPreviousData });
export const useConductReport = (f) => useQuery({ queryKey: ['conduct', 'report', f], queryFn: () => api.get(tok(), '/conduct/report', clean(f)), placeholderData: keepPreviousData });
export const useConductOverview = () => useQuery({ queryKey: ['conduct', 'overview'], queryFn: () => api.get(tok(), '/conduct/overview'), staleTime: 0 });
export const useMyConduct = () => useQuery({ queryKey: ['conduct', 'mine'], queryFn: () => api.get(tok(), '/conduct/mine'), staleTime: 0 });
export const useMySubmissions = () => useQuery({ queryKey: ['conduct', 'submitted'], queryFn: () => api.get(tok(), '/conduct/submitted'), staleTime: 0 });

export function useConductAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['conduct', 'leaders', 'leader'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })) // an approved major infraction can end a leader term
  });
}
