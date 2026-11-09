import { request } from './api';

/** Milestone 10. Students use today/mine/correction; the leader panel is still a student route. */
export const dtrService = {
  today: (t) => request('get', '/dtr/today', { token: t }),
  mine: (t) => request('get', '/dtr/mine', { token: t }),
  requestCorrection: (t, data) => request('post', '/dtr/correction', { token: t, data }),
  corrections: (t, params) => request('get', '/dtr/corrections', { token: t, params }),
  reviewCorrection: (t, data) => request('post', '/dtr/correction-review', { token: t, data }),
  leaderPanel: (t) => request('get', '/dtr/leader-panel', { token: t }),
  leaderRecord: (t, data) => request('post', '/dtr/leader-record', { token: t, data }),
  csform: (t, params) => request('get', '/dtr/csform', { token: t, params }),
  overview: (t, params) => request('get', '/dtr/overview', { token: t, params }),
  student: (t, studentId) => request('get', '/dtr/student', { token: t, params: { studentId } }),
  approve: (t, data) => request('post', '/dtr/approve', { token: t, data }),
  regenerate: (t, data) => request('post', '/dtr/regenerate', { token: t, data }),
  settings: (t) => request('get', '/dtr/settings', { token: t }),
  saveSettings: (t, data) => request('post', '/dtr/settings', { token: t, data })
};
