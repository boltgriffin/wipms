import { request } from './api';
export const gpsService = {
  today: (t) => request('get', '/attendance/today', { token: t }),
  check: (t, fix) => request('post', '/attendance/gps-check', { data: fix, token: t }),
  scan: (t, payload) => request('post', '/attendance/scan', { data: payload, token: t }),
  sync: (t, items) => request('post', '/attendance/sync', { data: { items, userAgent: navigator.userAgent }, token: t }),
  selfie: (t, id) => request('get', '/attendance/selfie', { token: t, params: { id } }),
  overview: (t) => request('get', '/gps/overview', { token: t }),
  records: (t, params) => request('get', '/gps/records', { token: t, params }),
  logs: (t, params) => request('get', '/gps/logs', { token: t, params }),
  post: (t, path, data) => request('post', path, { token: t, data })
};
