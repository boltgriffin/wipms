import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaderService as api } from '../services/leaderService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useLeaderOverview = () => useQuery({ queryKey: ['leaders', 'overview'], queryFn: () => api.get(tok(), '/leaders/overview'), staleTime: 0 });
export const useLeaderInstitution = (id) => useQuery({ queryKey: ['leaders', 'institution', id], queryFn: () => api.get(tok(), '/leaders/institution', { id }), enabled: !!id, staleTime: 0 });
export const useLeaderReports = (f) => useQuery({ queryKey: ['leaders', 'reports', f], queryFn: () => api.get(tok(), '/leaders/reports', clean(f)), placeholderData: keepPreviousData });
export const useInfractions = (f) => useQuery({ queryKey: ['infractions', f], queryFn: () => api.get(tok(), '/infractions/list', clean(f)), placeholderData: keepPreviousData });
export const useLeaderStatus = () => useQuery({ queryKey: ['leader', 'status'], queryFn: () => api.get(tok(), '/leader/status'), staleTime: 0 });

export function useLeaderAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['leaders', 'leader', 'infractions'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
