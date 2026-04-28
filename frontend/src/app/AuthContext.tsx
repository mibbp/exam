import { useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { logout as logoutRequest } from '../services/auth';
import { clearAuthState, getAuthState, setAuthState } from '../services/auth-store';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState(getAuthState());

  const value = useMemo(
    () => ({
      accessToken: session.accessToken,
      user: session.user,
      setSession(next: { accessToken: string | null; user: (typeof session.user) | null }) {
        setAuthState(next);
        setSessionState(next);
      },
      hasPermission(permission: string) {
        return Boolean(session.user?.permissions.includes(permission));
      },
      async clearSession() {
        try {
          await logoutRequest();
        } catch {
          // Ignore logout transport errors and clear local session anyway.
        }
        clearAuthState();
        setSessionState({ accessToken: null, user: null });
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
