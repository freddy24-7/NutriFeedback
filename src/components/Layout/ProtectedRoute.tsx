import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';

export function ProtectedRoute({ redirectTo = '/signin' }: { redirectTo?: string }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useTranslation();

  if (!isLoaded) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('common.loading')}
        </span>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
