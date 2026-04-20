import { Navigate, Outlet } from 'react-router-dom';
import { authClient } from '@/lib/auth/client';

export function ProtectedRoute({ redirectTo = '/signin' }: { redirectTo?: string }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Loading...
        </span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
