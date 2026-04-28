import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export function ProtectedRoute({ redirectTo = '/signin' }: { redirectTo?: string }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
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

  if (!isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
