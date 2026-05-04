import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import type { ProductResponse, RegisterProductSchema } from '@/types/api';
import type { z } from 'zod';

type RegisterProductInput = z.infer<typeof RegisterProductSchema>;

async function apiFetch<T>(
  url: string,
  getToken: () => Promise<string | null>,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30000),
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

export function useProduct(barcode: string | null) {
  const { getToken } = useAuth();
  return useQuery<ProductResponse>({
    queryKey: ['product', barcode],
    queryFn: () => apiFetch<ProductResponse>(`/api/barcode/${barcode!}`, getToken),
    enabled: barcode !== null && barcode.length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useRegisterProduct() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  return useMutation({
    mutationFn: (input: RegisterProductInput) =>
      apiFetch<ProductResponse>('/api/barcode/products', getToken, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      if (data.barcode) {
        queryClient.setQueryData(['product', data.barcode], data);
      }
    },
  });
}
