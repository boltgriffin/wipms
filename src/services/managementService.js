import { request } from './api';
const get = (path, token, params) => request('get', path, { token, params });
const post = (path, token, data) => request('post', path, { token, data });
export const managementService = {
  meta: (t) => get('/management/meta', t),
  students: (t, p) => get('/students/list', t, p),
  student: (t, id) => get('/students/get', t, { id }),
  studentAction: (t, name, data) => post('/students/' + name, t, data),      // create | update | delete | assign | unassign
  institutions: (t, p) => get('/institutions/list', t, p),
  institutionAction: (t, name, data) => post('/institutions/' + name, t, data) // create | update | delete
};
