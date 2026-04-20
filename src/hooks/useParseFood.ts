import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ParseFoodRequest, ParseFoodResponse } from '@/types/api';

async function parseFood(req: ParseFoodRequest): Promise<ParseFoodResponse> {
  const res = await fetch('/api/ai/parse-food', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (res.status === 402) throw new Error('insufficient_credits');
  if (res.status === 429) throw new Error('rate_limited');
  if (!res.ok) throw new Error('parse_failed');

  return res.json() as Promise<ParseFoodResponse>;
}

export function useParseFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: parseFood,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['food-log', variables.date] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    },
  });
}
