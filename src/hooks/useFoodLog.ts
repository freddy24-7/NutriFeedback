import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import type { FoodLogEntry } from '@/lib/db/schema';
import type { NewFoodEntryInput, NewFoodEntryWithProductSchema } from '@/types/api';
import type { z } from 'zod';

type NewFoodEntryWithProduct = z.infer<typeof NewFoodEntryWithProductSchema>;
import { todayISO } from '@/utils/date';

async function apiFetch<T>(
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

export function useFoodLog(date?: string) {
  const { isSignedIn, userId, getToken } = useAuth();
  const targetDate = date ?? todayISO();

  return useQuery<FoodLogEntry[]>({
    queryKey: ['food-log', userId, targetDate],
    queryFn: () => apiFetch<FoodLogEntry[]>(`/api/food-log?date=${targetDate}`, getToken),
    enabled: isSignedIn === true,
    staleTime: 60_000,
  });
}

export function useAddFoodEntry() {
  const queryClient = useQueryClient();
  const { isSignedIn, userId, getToken } = useAuth();

  return useMutation<FoodLogEntry, Error, NewFoodEntryInput | NewFoodEntryWithProduct>({
    mutationFn: (entry) =>
      apiFetch<FoodLogEntry>('/api/food-log', getToken, {
        method: 'POST',
        body: JSON.stringify(entry),
      }),
    onSuccess: (_, variables) => {
      if (isSignedIn) {
        void queryClient.invalidateQueries({
          queryKey: ['food-log', userId, variables.date],
        });
      }
    },
  });
}

export function useDeleteFoodEntry() {
  const queryClient = useQueryClient();
  const { isSignedIn, userId, getToken } = useAuth();

  return useMutation<{ ok: boolean }, Error, { id: string; date: string }>({
    mutationFn: ({ id }) =>
      apiFetch<{ ok: boolean }>(`/api/food-log/${id}`, getToken, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      if (isSignedIn) {
        void queryClient.invalidateQueries({
          queryKey: ['food-log', userId, variables.date],
        });
      }
    },
  });
}
