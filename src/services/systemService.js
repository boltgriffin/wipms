import { request } from './api';

/**
 * Backup, Reset and Trash Bin. Every route is administrator-only and the server checks the role
 * again on arrival, so hiding the menu is a convenience, not the control.
 */
export const systemService = {
  // Backups
  backups: (t, params) => request('get', '/backup/list', { token: t, params }),
  download: (t, params) => request('get', '/backup/download', { token: t, params }),
  createBackup: (t, data) => request('post', '/backup/create', { token: t, data }),
  deleteBackup: (t, data) => request('post', '/backup/delete', { token: t, data }),
  setSchedule: (t, data) => request('post', '/backup/schedule', { token: t, data }),
  restore: (t, data) => request('post', '/backup/restore', { token: t, data }),

  // Audit log (read-only by design: there is no route that edits or clears it)
  audit: (t, params) => request('get', '/backup/audit', { token: t, params }),

  // Reset
  resetOverview: (t) => request('get', '/reset/overview', { token: t }),
  resetImpact: (t, option) => request('get', '/reset/impact', { token: t, params: { option } }),
  verifyPassword: (t, data) => request('post', '/reset/verify-password', { token: t, data }),
  runReset: (t, data) => request('post', '/reset/execute', { token: t, data }),

  // Trash Bin
  trash: (t, params) => request('get', '/trash/list', { token: t, params }),
  trashPreview: (t, params) => request('get', '/trash/preview', { token: t, params }),
  moveToTrash: (t, data) => request('post', '/trash/move', { token: t, data }),
  restoreRecord: (t, data) => request('post', '/trash/restore', { token: t, data }),
  destroyRecord: (t, data) => request('post', '/trash/destroy', { token: t, data }),
  purgeNow: (t, data) => request('post', '/trash/purge-now', { token: t, data })
};

/**
 * Turns the base64 a small backup comes back as into a file the browser saves.
 * Large backups never travel this way; those come back as a Drive link instead.
 */
export function saveBase64(name, mimeType, base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
