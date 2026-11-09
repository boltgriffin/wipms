import { request } from './api';
export const supervisorService = {
  get: (t, path, params) => request('get', path, { token: t, params }),
  post: (t, path, data) => request('post', path, { token: t, data })
};
