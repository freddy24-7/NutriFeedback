import { createAuthClient } from 'better-auth/react';

/** Same origin as the running app when unset — works with Vite `/api` proxy in dev. */
function authBaseUrl(): string {
  const fromEnv = import.meta.env['VITE_APP_URL'] as string | undefined;
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // SSR / tests: avoid wrong host in production bundles
  return import.meta.env.DEV ? 'http://localhost:5173' : '';
}

export const authClient = createAuthClient({
  baseURL: authBaseUrl(),
});
