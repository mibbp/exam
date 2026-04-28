import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearAuthState, getAuthState, setAuthState } from './auth-store';
import type { AuthResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  queue.push(cb);
}

function onRefreshed(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getAuthState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (!original || error.response?.status !== 401 || original._retry) {
      throw error;
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      const auth = data as { accessToken: string | null; user: AuthResponse['user'] | null };
      if (!auth.accessToken || !auth.user) {
        clearAuthState();
        onRefreshed(null);
        throw error;
      }
      setAuthState({ accessToken: auth.accessToken, user: auth.user });
      onRefreshed(auth.accessToken);
      original.headers.Authorization = `Bearer ${auth.accessToken}`;
      return api(original);
    } catch (refreshError) {
      clearAuthState();
      onRefreshed(null);
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;

