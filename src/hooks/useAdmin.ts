import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  signedUpAt: string;
  lastSignInAt: string | null;
  language: string;
  subscriptionStatus: 'trial' | 'active' | 'comped' | 'expired' | 'cancelled';
  stripeCustomerId: string | null;
  creditsRemaining: number;
  creditsUsed: number;
  creditsExpiresAt: string | null;
  foodLogEntries: number;
  apiCalls: number;
}

async function authFetch<T>(
  url: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useAdminUsers() {
  const { getToken } = useAuth();
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => authFetch<AdminUser[]>('/api/admin/users', getToken),
    staleTime: 30_000,
  });
}

export function useAdjustCredits() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    { ok: boolean; creditsRemaining: number },
    Error,
    { userId: string; amount: number }
  >({
    mutationFn: (input) =>
      authFetch('/api/admin/credits', getToken, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<AdminUser[]>(['admin', 'users'], (old) =>
        old?.map((u) =>
          u.id === variables.userId ? { ...u, creditsRemaining: data.creditsRemaining } : u,
        ),
      );
    },
  });
}
