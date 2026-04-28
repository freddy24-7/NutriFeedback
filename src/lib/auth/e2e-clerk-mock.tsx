/* eslint-disable react-refresh/only-export-components */
import React from 'react';

// E2E-only mock — replaces @clerk/clerk-react when VITE_E2E_TEST_MODE=true.
// Tests control auth state by writing to window.__e2e_signed_out or
// window.__e2e_signin_error before navigation via page.addInitScript().

type Env = typeof globalThis & Record<string, unknown>;

function getAuthState() {
  if (typeof window !== 'undefined' && (window as Env).__e2e_signed_out) {
    return { isSignedIn: false as const, userId: null as null };
  }
  return { isSignedIn: true as const, userId: 'user_e2e' };
}

function signInShouldFail() {
  return typeof window !== 'undefined' && Boolean((window as Env).__e2e_signin_error);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function AuthenticateWithRedirectCallback(_props: {
  afterSignInUrl?: string;
  afterSignUpUrl?: string;
}) {
  return null;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAuth() {
  const { isSignedIn, userId } = getAuthState();
  return {
    isLoaded: true,
    isSignedIn,
    userId,
    getToken: async () => 'e2e-test-token',
  };
}

export function useUser() {
  const { isSignedIn, userId } = getAuthState();
  return {
    isLoaded: true,
    isSignedIn,
    user: isSignedIn
      ? {
          id: userId,
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          firstName: 'Test',
          lastName: 'User',
        }
      : null,
  };
}

export function useSignIn() {
  const signIn = {
    create: async (params?: Record<string, unknown>) => {
      // Forgot-password flow — always succeeds so the "reset" step renders
      if (params?.['strategy'] === 'reset_password_email_code') {
        return { status: 'needs_first_factor' as const, createdSessionId: null };
      }
      if (signInShouldFail()) throw new Error('Invalid credentials');
      return { status: 'complete' as const, createdSessionId: 'sess_e2e' };
    },
    authenticateWithRedirect: async () => {},
    attemptFirstFactor: async () => ({
      status: 'complete' as const,
      createdSessionId: 'sess_e2e',
    }),
  };
  return { isLoaded: true, signIn, setActive: async () => {} };
}

export function useSignUp() {
  const signUp = {
    create: async () => ({
      status: 'missing_requirements' as const,
      createdSessionId: null,
    }),
    prepareEmailAddressVerification: async () => {},
    attemptEmailAddressVerification: async () => ({
      status: 'complete' as const,
      createdSessionId: 'sess_e2e',
    }),
    authenticateWithRedirect: async () => {},
  };
  return { isLoaded: true, signUp, setActive: async () => {} };
}

export function useClerk() {
  return {
    signOut: async () => {},
    session: { getToken: async () => 'e2e-test-token' },
  };
}
