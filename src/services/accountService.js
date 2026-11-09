import { request } from './api';

/** Account management is administrator-only, except the last one: anyone may change their own password. */
export const accountService = {
  list: (t, params) => request('get', '/users/list', { token: t, params }),
  credentials: (t, params) => request('get', '/users/credentials', { token: t, params }),
  settings: (t) => request('get', '/users/settings', { token: t }),
  generate: (t, data) => request('post', '/users/generate', { token: t, data }),
  reset: (t, data) => request('post', '/users/reset', { token: t, data }),
  setStatus: (t, data) => request('post', '/users/status', { token: t, data }),
  saveSettings: (t, data) => request('post', '/users/settings', { token: t, data }),
  changePassword: (t, data) => request('post', '/users/change-password', { token: t, data })
};
