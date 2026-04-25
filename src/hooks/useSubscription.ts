import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth/client';
import type { SubscriptionResponse, DiscountValidateInput, CheckoutRequest } from '@/types/api';

async function fetchSubscription(): Promise<SubscriptionResponse> {
  const res = await fetch('/api/payments/status', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch subscription status');
  return res.json() as Promise<SubscriptionResponse>;
}

export function useSubscription() {
  const { data: session } = authClient.useSession();

  return useQuery<SubscriptionResponse>({
    queryKey: ['subscription', session?.user?.id],
    queryFn: fetchSubscription,
    enabled: session !== null && session !== undefined,
    staleTime: 60_000,
  });
}

export function useApplyDiscount() {
  const queryClient = useQueryClient();

  return useMutation<{ granted: boolean; type: string }, Error, DiscountValidateInput>({
    mutationFn: async (input) => {
      const res = await fetch('/api/payments/discount', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to apply discount code');
      }
      return res.json() as Promise<{ granted: boolean; type: string }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useStartCheckout() {
  return useMutation<{ url: string }, Error, CheckoutRequest>({
    mutationFn: async (input) => {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to start checkout');
      }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
