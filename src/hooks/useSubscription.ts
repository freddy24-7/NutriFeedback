import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import type { SubscriptionResponse, DiscountValidateInput, CheckoutRequest } from '@/types/api';

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

export function useSubscription() {
  const { isSignedIn, userId, getToken } = useAuth();

  return useQuery<SubscriptionResponse>({
    queryKey: ['subscription', userId],
    queryFn: () => authFetch<SubscriptionResponse>('/api/payments/status', getToken),
    enabled: isSignedIn === true,
    staleTime: 60_000,
  });
}

export function useApplyDiscount() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation<{ granted: boolean; type: string }, Error, DiscountValidateInput>({
    mutationFn: (input) =>
      authFetch('/api/payments/discount', getToken, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useStartCheckout() {
  const { getToken } = useAuth();

  return useMutation<{ url: string }, Error, CheckoutRequest>({
    mutationFn: (input) =>
      authFetch('/api/payments/checkout', getToken, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
