import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { journalService as api } from '../services/journalService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export const useJournalOverview = () => useQuery({ queryKey: ['journal-overview'], queryFn: () => api.overview(tok()) });
export const useMyJournals = (f) => useQuery({ queryKey: ['journals', 'mine', f], queryFn: () => api.mine(tok(), clean(f)), placeholderData: keepPreviousData });
export const useJournalQueue = (f) => useQuery({ queryKey: ['journals', 'queue', f], queryFn: () => api.queue(tok(), clean(f)), placeholderData: keepPreviousData });
export const useJournal = (id) => useQuery({ queryKey: ['journal', id], queryFn: () => api.one(tok(), id), enabled: !!id });

function useAct(fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => ['journals', 'journal', 'journal-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })) });
}
export const useSaveJournal = (edit) => useAct((data) => api.save(tok(), edit ? 'update' : 'create', data));
export const useReviewJournal = () => useAct((data) => api.review(tok(), data));
