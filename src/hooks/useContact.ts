import { useMutation } from '@tanstack/react-query';
import type { ContactFormInput } from '@/types/api';

export function useContact() {
  return useMutation<{ ok: boolean }, Error, ContactFormInput>({
    mutationFn: async (data) => {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ ok: boolean }>;
    },
  });
}
