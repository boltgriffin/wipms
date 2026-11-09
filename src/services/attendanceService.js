import { request } from './api';
export const attendanceService = {
  submit: (token, data) => request('post', '/attendance/submit', { data, token }),
  mine: (token) => request('get', '/attendance/mine', { token }),
  today: (token) => request('get', '/attendance/today', { token }),
  gpsCheck: (token, fix) => request('post', '/attendance/gps-check', { data: fix, token }),
  scan: (token, payload) => request('post', '/attendance/scan', { data: payload, token }),
  students: (token) => request('get', '/attendance/students', { token }),
  student: (token, studentId) => request('get', '/attendance/student', { token, params: { studentId } }),
  setHours: (token, studentId, hours) => request('post', '/attendance/required-hours', { data: { studentId, hours }, token }),
  analytics: (token) => request('get', '/attendance/analytics', { token }),
  report: (token, params) => request('get', '/attendance/report', { token, params })
};
