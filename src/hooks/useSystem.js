import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { systemService as api } from '../services/systemService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;

/* ---------- Backups ---------- */

export const useBackups = (params) => useQuery({
  queryKey: ['system', 'backups', params], queryFn: () => api.backups(tok(), params), staleTime: 15 * 1000
});

/**
 * Anything that creates, deletes or restores a backup clears the whole system tree. A restore in
 * particular can have changed every figure on every page, so the safest thing is to treat the
 * entire cache as stale rather than guess which queries survived.
 */
export function useBackupAction(kind) {
  const qc = useQueryClient();
  const fn = { create: api.createBackup, delete: api.deleteBackup, schedule: api.setSchedule, restore: api.restore }[kind];
  return useMutation({
    mutationFn: (data) => fn(tok(), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system'] });
      if (kind === 'restore') qc.invalidateQueries();   // a restore rewrites whole sheets
    }
  });
}

/* ---------- Audit log ---------- */

/** Paged on the server; after a year this sheet is far too big to send in one piece. */
export const useAuditLogs = (params) => useQuery({
  queryKey: ['system', 'audit', params], queryFn: () => api.audit(tok(), params), staleTime: 15 * 1000
});

/* ---------- Reset ---------- */

export const useResetOverview = () => useQuery({
  queryKey: ['system', 'reset', 'overview'], queryFn: () => api.resetOverview(tok()), staleTime: 10 * 1000
});

/** Counted fresh every time the dialog opens; a stale impact figure is worse than none. */
export const useResetImpact = (option) => useQuery({
  queryKey: ['system', 'reset', 'impact', option], queryFn: () => api.resetImpact(tok(), option),
  enabled: !!option, staleTime: 0, gcTime: 0
});

export function useRunReset() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => api.runReset(tok(), data), onSuccess: () => qc.invalidateQueries() });
}

/* ---------- Trash Bin ---------- */

export const useTrash = (params) => useQuery({
  queryKey: ['system', 'trash', params], queryFn: () => api.trash(tok(), params), staleTime: 15 * 1000
});

export const useTrashPreview = (type, id) => useQuery({
  queryKey: ['system', 'trash', 'preview', type, id], queryFn: () => api.trashPreview(tok(), { type, id }),
  enabled: !!(type && id), staleTime: 0, gcTime: 0
});

export function useTrashAction(kind) {
  const qc = useQueryClient();
  const fn = { move: api.moveToTrash, restore: api.restoreRecord, destroy: api.destroyRecord, purge: api.purgeNow }[kind];
  return useMutation({
    mutationFn: (data) => fn(tok(), data),
    // Moving a record to the bin or bringing it back changes the lists on half the pages, so
    // everything is refetched rather than a hand-maintained list of affected keys.
    onSuccess: () => qc.invalidateQueries()
  });
}
