import { createContext } from 'react';
import type { AuthUser } from '../types';

export interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string | null; user: AuthUser | null }) => void;
  clearSession: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
