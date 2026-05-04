import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProductResponse, RegisterProductSchema } from '@/types/api';
import type { z } from 'zod';

type RegisterProductInput = z.infer<typeof RegisterProductSchema>;

async function fetchProduct(barcode: string): Promise<ProductResponse> {
  const res = await fetch(`/api/barcode/${barcode}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? 'Failed to look up product');
  }
  return res.json() as Promise<ProductResponse>;
}

async function registerProduct(input: RegisterProductInput): Promise<ProductResponse> {
  const res = await fetch('/api/barcode/products', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? 'Failed to register product');
  }
  return res.json() as Promise<ProductResponse>;
}

export function useProduct(barcode: string | null) {
  return useQuery<ProductResponse>({
    queryKey: ['product', barcode],
    queryFn: () => fetchProduct(barcode!),
    enabled: barcode !== null && barcode.length > 0,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    retry: false,
  });
}

export function useRegisterProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerProduct,
    onSuccess: (data) => {
      if (data.barcode) {
        queryClient.setQueryData(['product', data.barcode], data);
      }
    },
  });
}
