import api from './client';
import type { PagedResult, UserRow } from '../types';

export async function listUsers(params?: Record<string, unknown>) {
  const { data } = await api.get<PagedResult<UserRow>>('/users', { params });
  return data;
}

export async function createUser(payload: {
  username: string;
  password: string;
  displayName?: string;
  role: 'ADMIN' | 'STUDENT';
  status?: 'ACTIVE' | 'DISABLED';
  roleIds?: number[];
}) {
  const { data } = await api.post<UserRow>('/users', payload);
  return data;
}

export async function updateUser(
  id: number,
  payload: Partial<{ displayName?: string; role: 'ADMIN' | 'STUDENT'; status: 'ACTIVE' | 'DISABLED' }>,
) {
  const { data } = await api.patch<UserRow>(`/users/${id}`, payload);
  return data;
}

export async function updateUserRoles(id: number, roleIds: number[]) {
  const { data } = await api.patch<UserRow>(`/users/${id}/roles`, { roleIds });
  return data;
}

export async function resetUserPassword(id: number, password: string) {
  await api.post(`/users/${id}/reset-password`, { password });
}

