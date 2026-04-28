import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@clerk/clerk-react';

export function AuthConfirmPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      void navigate('/dashboard');
    }
  }, [isSignedIn, isLoaded, navigate]);

  return (
    <>
      <Helmet>
        <title>{t('app.name')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="text-center">
        {!isLoaded || isSignedIn ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('auth.confirm.loading')}
          </p>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--color-error)' }}>
              {t('auth.confirm.error')}
            </p>
            <Link
              to="/signin"
              className="mt-4 block text-sm font-medium"
              style={{ color: 'var(--color-brand)' }}
            >
              {t('auth.confirm.tryAgain')}
            </Link>
          </>
        )}
      </div>
    </>
  );
}
