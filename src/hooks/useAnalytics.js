import { useQuery } from '@tanstack/react-query';
import { analyticsService as api } from '../services/analyticsService';
import { useAuthStore } from '../store/authStore';

const tok = () => useAuthStore.getState().token;
// staleTime 0: numbers are refetched every time the dashboard opens, so new attendance and journals show up
export const useTeacherAnalytics = () => useQuery({ queryKey: ['analytics', 'teacher'], queryFn: () => api.teacher(tok()), staleTime: 0 });
export const useStudentAnalytics = () => useQuery({ queryKey: ['analytics', 'student'], queryFn: () => api.student(tok()), staleTime: 0 });
