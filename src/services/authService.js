import { request } from './api';
export const authService = {
  // Either a username (the person's reference ID) or an email; the server tries both.
  login: (username, password) => request('post', '/auth/login', { data: { username, email: username, password } }),
  me: (token) => request('get', '/auth/me', { token }),
  logout: (token) => request('post', '/auth/logout', { token })
};
