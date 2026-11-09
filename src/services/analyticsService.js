import { request } from './api';
export const analyticsService = {
  teacher: (t) => request('get', '/analytics/teacher', { token: t }),
  student: (t) => request('get', '/analytics/student', { token: t })
};
