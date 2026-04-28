import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiTipResponse } from '@/types/api';
import { useAuth } from '@clerk/clerk-react';

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
    const status = res.status;
    let serverError: string | undefined;
    try {
      const body: unknown = await res.json();
      if (
        body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
      ) {
        serverError = (body as { error: string }).error;
      }
    } catch {
      /* non-JSON body */
    }
    if (status === 402) throw new Error('insufficient_credits');
    if (status === 422) throw new Error(serverError ?? 'not_enough_data');
    if (status === 429) throw new Error('rate_limited');
    throw new Error('generation_failed');
  }
  return res.json() as Promise<T>;
}

export function useAiTips() {
  const { isSignedIn, userId, getToken } = useAuth();

  return useQuery<AiTipResponse[]>({
    queryKey: ['ai-tips', userId],
    queryFn: () => authFetch<AiTipResponse[]>('/api/ai/tips', getToken),
    enabled: isSignedIn === true,
    staleTime: 5 * 60_000,
    // Default retry=3 re-runs the request 4× total — can amplify 429s from upstream or look like “spam”.
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === 'rate_limited') return false;
      return failureCount < 2;
    },
  });
}

export function useGenerateTip() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: () =>
      authFetch<AiTipResponse>('/api/ai/generate-tips', getToken, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-tips'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useDismissTip() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: (id: string) =>
      authFetch<void>(`/api/ai/tips/${id}/dismiss`, getToken, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-tips'] });
    },
  });
}
