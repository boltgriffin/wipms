import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deployService as api } from '../services/deployService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;

export const useDeployDashboard = () => useQuery({ queryKey: ['deploy', 'dashboard'], queryFn: () => api.dashboard(tok()), staleTime: 30 * 1000 });
export const useCapacities = (params) => useQuery({ queryKey: ['deploy', 'institutions', params], queryFn: () => api.institutions(tok(), params), staleTime: 30 * 1000 });
export const usePlacements = (params) => useQuery({ queryKey: ['deploy', 'placements', params], queryFn: () => api.placements(tok(), params), staleTime: 30 * 1000 });
export const useBatches = () => useQuery({ queryKey: ['deploy', 'batches'], queryFn: () => api.batches(tok()), staleTime: 30 * 1000 });
export const usePlacementLogs = (studentId) => useQuery({ queryKey: ['deploy', 'logs', studentId || 'all'], queryFn: () => api.logs(tok(), studentId ? { studentId } : {}), staleTime: 60 * 1000 });
export const useStrandMap = () => useQuery({ queryKey: ['deploy', 'strand-map'], queryFn: () => api.strandMap(tok()), staleTime: 10 * 60 * 1000 });
/** A student's own optional home pin. Nothing else in the system waits on it. */
export const useHomeLocation = () => useQuery({ queryKey: ['deploy', 'my-home'], queryFn: () => api.myHome(tok()), staleTime: 60 * 1000 });
export function useHomeLocationAction() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => api.saveMyHome(tok(), data), onSuccess: () => qc.invalidateQueries({ queryKey: ['deploy'] }) });
}
/** The dry run. Enabled only while the preview is open, because it walks every unplaced student. */
export const useAssignPreview = (scope, enabled) => useQuery({
  queryKey: ['deploy', 'preview', scope || 'all'], queryFn: () => api.preview(tok(), { scope }), enabled: !!enabled, staleTime: 0
});

/**
 * One mutation hook for everything that moves a student or a slot. Placement, capacity and attendance
 * figures all read from the same rows, so the whole deploy tree is cleared along with the dashboards
 * and the student lists that quote the same numbers.
 */
export function useDeployAction(kind) {
  const qc = useQueryClient();
  const fn = {
    capacity: api.saveCapacity, run: api.run, fillWaitlist: api.fillWaitlist, assign: api.assign,
    address: api.address, batch: api.saveBatch, batchDelete: api.deleteBatch, batchAssign: api.batchAssign,
    autoBatch: api.autoBatch, strandMap: api.saveStrandMap
  }[kind];
  return useMutation({
    mutationFn: (data) => (kind === 'fillWaitlist' ? fn(tok()) : fn(tok(), data)),
    onSuccess: () => {
      ['deploy', 'students', 'institutions', 'analytics', 'completion', 'notifications', 'dtr'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    }
  });
}
