import api from './client';
import type { AuthResponse } from '../types';

export async function login(username: string, password: string) {
  const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}

