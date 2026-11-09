import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shellService as api } from '../services/shellService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const FALLBACK = { schoolName: 'Work Immersion', abbreviation: 'WIPMS', systemName: 'Work Immersion Progress Monitoring System', divisionName: '', schoolLogo: null, divisionLogo: null };

/** Branding rarely changes, so it is cached for the session and shared by the login page, the shell and the PDF export. */
export function useBranding() {
  const q = useQuery({ queryKey: ['branding'], queryFn: () => api.branding(), staleTime: 30 * 60 * 1000, retry: 1 });
  return { ...q, branding: q.data || FALLBACK };
}
export const useNotifications = () => useQuery({
  queryKey: ['notifications'], queryFn: () => api.notifications(tok()),
  staleTime: 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: false
});

export function useBrandingAction(kind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => (kind === 'logo' ? api.logo(tok(), data) : api.save(tok(), data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branding'] })
  });
}

/** The same payload the shell uses, for the PDF export header. */
export const logoDataUri = (logo) => (logo ? `data:${logo.mimeType};base64,${logo.data}` : null);
