import api from './client';
import type { Permission, Role } from '../types';

export async function listRoles() {
  const { data } = await api.get<Role[]>('/roles');
  return data;
}

export async function listPermissions() {
  const { data } = await api.get<Permission[]>('/roles/permissions');
  return data;
}

export async function createRole(payload: { code: string; name: string; description?: string; permissionCodes?: string[] }) {
  const { data } = await api.post<Role>('/roles', payload);
  return data;
}

export async function updateRole(id: number, payload: { name?: string; description?: string; permissionCodes?: string[] }) {
  const { data } = await api.patch<Role>(`/roles/${id}`, payload);
  return data;
}

export async function updateRolePermissions(id: number, permissionCodes: string[]) {
  const { data } = await api.patch<Role>(`/roles/${id}/permissions`, { permissionCodes });
  return data;
}

