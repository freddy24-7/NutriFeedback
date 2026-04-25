import { useMutation } from '@tanstack/react-query';
import type { ChatRequest, ChatResponse } from '@/types/api';

export function useSendChatMessage() {
  return useMutation<ChatResponse, Error, ChatRequest>({
    mutationFn: async (input) => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (res.status === 429) {
        throw new Error('rate_limit_exceeded');
      }
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? 'Failed to send message');
      }

      return res.json() as Promise<ChatResponse>;
    },
  });
}
