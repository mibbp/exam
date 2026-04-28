import { useContext } from 'react';
import { AuthContext } from './auth-context';

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function usePermission(permission: string) {
  return useAuth().hasPermission(permission);
}
