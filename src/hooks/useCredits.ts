import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';

export function useCredits() {
  const { isSignedIn, userId } = useAuth();

  // Credits are returned as part of /api/payments/status — no separate endpoint needed.
  // This hook is kept for backward compatibility; use useSubscription() directly instead.
  return useQuery({
    queryKey: ['credits', userId],
    queryFn: async () => {
      const res = await fetch('/api/payments/status', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch credits');
      return res.json() as Promise<{ creditsRemaining: number; creditsExpiresAt: string | null }>;
    },
    enabled: isSignedIn === true,
    staleTime: 30_000,
  });
}
