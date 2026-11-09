import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountService as api } from '../services/accountService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;

export const useUsers = (params) => useQuery({ queryKey: ['users', 'list', params], queryFn: () => api.list(tok(), params), staleTime: 30 * 1000 });
export const useAccountSettings = () => useQuery({ queryKey: ['users', 'settings'], queryFn: () => api.settings(tok()), staleTime: 10 * 60 * 1000 });

/**
 * Generating, resetting and changing a status all move the same rows, so the whole users tree is
 * cleared, along with the student and deployment lists that show whether a person has an account.
 */
export function useAccountAction(kind) {
  const qc = useQueryClient();
  const fn = { generate: api.generate, reset: api.reset, status: api.setStatus, settings: api.saveSettings, changePassword: api.changePassword }[kind];
  return useMutation({
    mutationFn: (data) => fn(tok(), data),
    onSuccess: () => ['users', 'students', 'teachers', 'deploy'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  });
}
/** Fetched on demand, not cached: a credential list is only pulled when someone is about to export it. */
export async function fetchCredentials(params) { return api.credentials(tok(), params); }
