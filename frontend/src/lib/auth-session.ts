import axios, { type AxiosInstance } from 'axios';

// Single source of truth for auth session state.
// Owns: localStorage token storage, Bearer header sync, 401 refresh-then-retry.
// Contract (unchanged): localStorage keys 'access_token'/'refresh_token',
// `Bearer <token>` Authorization header, redirect to /login on failed refresh.
// No cookies.

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** Subscribe to session changes (login/logout/refresh/clear). Returns unsubscribe. */
export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Persist a full session (login). Single write point. */
export function setSession(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  notify();
}

/** Persist a rotated access token (401 refresh). Single write point. */
export function setAccessToken(access: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  notify();
}

/** Clear the whole session (logout / failed refresh). Single clear point. */
export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  notify();
}

/** Sync the Bearer header of a client with the stored access token. */
export function applyAuthHeader(client: AxiosInstance): void {
  const token = getAccessToken();
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

// Single-flight refresh: concurrent 401s share one POST /auth/refresh/ call.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(baseURL: string): Promise<string> {
  if (!refreshPromise) {
    const refresh = getRefreshToken();
    if (!refresh) {
      return Promise.reject(new Error('No refresh token'));
    }
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh/`, { refresh })
      .then((response) => {
        const { access } = response.data as { access: string };
        setAccessToken(access);
        return access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLoginOnce(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

interface RetryableRequest {
  _retry?: boolean;
  headers?: Record<string, string>;
}

/**
 * Attach the 401 refresh-then-retry interceptor to a client.
 * On refresh failure clears the session once and redirects to /login.
 */
export function attachAuthInterceptor(client: AxiosInstance, baseURL: string): void {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as (RetryableRequest & Record<string, unknown>) | undefined;
      if (!originalRequest) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const access = await refreshAccessToken(baseURL);
          applyAuthHeader(client);
          originalRequest.headers = {
            ...(originalRequest.headers ?? {}),
            Authorization: `Bearer ${access}`,
          };
          return client(originalRequest as never);
        } catch (refreshError) {
          clearSession();
          applyAuthHeader(client);
          redirectToLoginOnce();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    },
  );
}
