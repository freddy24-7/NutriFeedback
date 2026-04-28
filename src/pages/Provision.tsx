import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';

export function ProvisionPage() {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      void navigate('/signin');
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    void (async () => {
      const token = await getToken();
      if (token) {
        await fetch('/api/auth/on-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      }
      void navigate('/dashboard');
    })();
  }, [isLoaded, isSignedIn, getToken, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('common.loading')}
      </p>
    </div>
  );
}
