import { request } from './api';
export const shellService = {
  branding: () => request('get', '/branding/public'),            // no token: the login page needs this
  notifications: (t) => request('get', '/notifications/list', { token: t }),
  save: (t, data) => request('post', '/branding/save', { token: t, data }),
  logo: (t, data) => request('post', '/branding/logo', { token: t, data })
};
