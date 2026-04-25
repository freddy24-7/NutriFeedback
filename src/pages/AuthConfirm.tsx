import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';

export function AuthConfirmPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  // Better Auth passes a token in the URL for email verification and password reset.
  // We verify it here and redirect on success.
  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      // No token — check if already signed in (e.g. redirect after sign-up)
      authClient
        .getSession()
        .then(({ data }) => {
          if (data?.session) {
            setStatus('success');
            const timer = setTimeout(() => {
              void navigate('/dashboard');
            }, 1500);
            return () => clearTimeout(timer);
          }
          setStatus('error');
          return undefined;
        })
        .catch(() => {
          setStatus('error');
        });
      return;
    }

    authClient
      .verifyEmail({ query: { token } })
      .then(({ error }) => {
        if (error) {
          setStatus('error');
          return;
        }
        setStatus('success');
        const timer = setTimeout(() => {
          void navigate('/dashboard');
        }, 1500);
        return () => clearTimeout(timer);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams, navigate]);

  return (
    <>
      <Helmet>
        <title>{t('app.name')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="text-center">
        {status === 'loading' && (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('auth.confirm.loading')}
          </p>
        )}
        {status === 'success' && (
          <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>
            {t('auth.confirm.success')}
          </p>
        )}
        {status === 'error' && (
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
