import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth/client';
import type { FoodLogEntry } from '@/lib/db/schema';
import type { NewFoodEntryInput, NewFoodEntryWithProductSchema } from '@/types/api';
import type { z } from 'zod';

type NewFoodEntryWithProduct = z.infer<typeof NewFoodEntryWithProductSchema>;
import { todayISO } from '@/utils/date';

// Better Auth uses cookies for sessions — credentials: 'include' sends them automatically.
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function useFoodLog(date?: string) {
  const { data: session } = authClient.useSession();
  const targetDate = date ?? todayISO();

  return useQuery<FoodLogEntry[]>({
    queryKey: ['food-log', session?.user.id, targetDate],
    queryFn: () => apiFetch<FoodLogEntry[]>(`/api/food-log?date=${targetDate}`),
    enabled: session !== null && session !== undefined,
    staleTime: 60_000,
  });
}

export function useAddFoodEntry() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation<FoodLogEntry, Error, NewFoodEntryInput | NewFoodEntryWithProduct>({
    mutationFn: (entry) =>
      apiFetch<FoodLogEntry>('/api/food-log', {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['food-log', session?.user.id, variables.date],
      });
    },
  });
}

export function useDeleteFoodEntry() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation<{ ok: boolean }, Error, { id: string; date: string }>({
    mutationFn: ({ id }) => apiFetch<{ ok: boolean }>(`/api/food-log/${id}`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['food-log', session?.user.id, variables.date],
      });
    },
  });
}
