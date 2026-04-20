import { useQuery } from '@tanstack/react-query';
import type { UserCredits } from '@/lib/db/schema';
import { authClient } from '@/lib/auth/client';

async function fetchCredits(): Promise<UserCredits> {
  const res = await fetch('/api/credits', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch credits');
  return res.json() as Promise<UserCredits>;
}

export function useCredits() {
  const { data: session } = authClient.useSession();

  return useQuery<UserCredits>({
    queryKey: ['credits', session?.user.id],
    queryFn: fetchCredits,
    enabled: session !== null && session !== undefined,
    staleTime: 30_000,
  });
}
