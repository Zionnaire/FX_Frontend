import api from './api';

export function login(email: string, password: string) {
  return api.post('/auth/login', { email, password });
}

export function register(name: string, email: string, password: string) {
  return api.post('/auth/register', { name, email, password });
}

export function logout() {
  return api.post('/auth/logout');
}

export function refreshToken() {
  return api.post('/auth/refresh');
}

export function getProfile() {
  return api.get('/user/profile');
}
