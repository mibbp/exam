import type { AuthUser } from '../types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
}

const KEY = 'exam-auth';

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { accessToken: null, user: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { accessToken: null, user: null };
  }
}

let state = load();

export function getAuthState() {
  return state;
}

export function setAuthState(next: AuthState) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearAuthState() {
  state = { accessToken: null, user: null };
  localStorage.removeItem(KEY);
}

