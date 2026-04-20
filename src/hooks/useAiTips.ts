import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AiTipResponse } from '@/types/api';
import { authClient } from '@/lib/auth/client';

async function fetchTips(): Promise<AiTipResponse[]> {
  const res = await fetch('/api/ai/tips', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch tips');
  return res.json() as Promise<AiTipResponse[]>;
}

async function generateTip(): Promise<AiTipResponse> {
  const res = await fetch('/api/ai/generate-tips', {
    method: 'POST',
    credentials: 'include',
  });
  if (res.status === 402) throw new Error('insufficient_credits');
  if (res.status === 422) throw new Error('not_enough_data');
  if (res.status === 429) throw new Error('rate_limited');
  if (!res.ok) throw new Error('generation_failed');
  return res.json() as Promise<AiTipResponse>;
}

async function dismissTip(id: string): Promise<void> {
  const res = await fetch(`/api/ai/tips/${id}/dismiss`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to dismiss tip');
}

export function useAiTips() {
  const { data: session } = authClient.useSession();

  return useQuery<AiTipResponse[]>({
    queryKey: ['ai-tips', session?.user.id],
    queryFn: fetchTips,
    enabled: session !== null && session !== undefined,
    staleTime: 5 * 60_000,
  });
}

export function useGenerateTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateTip,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-tips'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}

export function useDismissTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dismissTip,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-tips'] });
    },
  });
}
