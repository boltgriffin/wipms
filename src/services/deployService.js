import { request } from './api';

/** Milestone 11. Every route here is administrator-only; the server enforces it as well. */
export const deployService = {
  dashboard: (t) => request('get', '/deploy/dashboard', { token: t }),
  institutions: (t, params) => request('get', '/deploy/institutions', { token: t, params }),
  placements: (t, params) => request('get', '/deploy/placements', { token: t, params }),
  preview: (t, params) => request('get', '/deploy/preview', { token: t, params }),
  batches: (t) => request('get', '/deploy/batches', { token: t }),
  logs: (t, params) => request('get', '/deploy/logs', { token: t, params }),
  strandMap: (t) => request('get', '/deploy/strand-map', { token: t }),
  saveCapacity: (t, data) => request('post', '/deploy/capacity', { token: t, data }),
  run: (t, data) => request('post', '/deploy/run', { token: t, data }),
  fillWaitlist: (t) => request('post', '/deploy/fill-waitlist', { token: t, data: {} }),
  assign: (t, data) => request('post', '/deploy/assign', { token: t, data }),
  address: (t, data) => request('post', '/deploy/address', { token: t, data }),
  saveBatch: (t, data) => request('post', '/deploy/batch', { token: t, data }),
  deleteBatch: (t, data) => request('post', '/deploy/batch-delete', { token: t, data }),
  batchAssign: (t, data) => request('post', '/deploy/batch-assign', { token: t, data }),
  autoBatch: (t, data) => request('post', '/deploy/auto-batch', { token: t, data }),
  saveStrandMap: (t, data) => request('post', '/deploy/strand-map', { token: t, data }),
  // The one route here a student may call, and only for their own pin.
  myHome: (t) => request('get', '/deploy/my-home', { token: t }),
  saveMyHome: (t, data) => request('post', '/deploy/my-home', { token: t, data })
};
