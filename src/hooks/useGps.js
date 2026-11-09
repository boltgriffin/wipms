import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gpsService as api } from '../services/gpsService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useGpsOverview = () => useQuery({ queryKey: ['gps', 'overview'], queryFn: () => api.overview(tok()), staleTime: 0 });
export const useGpsRecords = (f) => useQuery({ queryKey: ['gps', 'records', f], queryFn: () => api.records(tok(), clean(f)), placeholderData: keepPreviousData });
export const useGpsLogs = (f) => useQuery({ queryKey: ['gps', 'logs', f], queryFn: () => api.logs(tok(), clean(f)), placeholderData: keepPreviousData });
export const useToday = () => useQuery({ queryKey: ['gps', 'today'], queryFn: () => api.today(tok()), staleTime: 0 });

export function useGpsAction(path) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post(tok(), path, data),
    onSuccess: () => ['gps', 'attendance', 'analytics'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
