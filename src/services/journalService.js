import { request } from './api';
const get = (path, token, params) => request('get', path, { token, params });
export const journalService = {
  overview: (t) => get('/journals/overview', t),
  mine: (t, f) => get('/journals/mine', t, f),
  queue: (t, f) => get('/journals/queue', t, f),
  one: (t, id) => get('/journals/get', t, { id }),
  proof: (t, id) => get('/journals/proof', t, { id }),
  save: (t, name, data) => request('post', '/journals/' + name, { token: t, data }), // create | update
  review: (t, data) => request('post', '/journals/review', { token: t, data })
};
