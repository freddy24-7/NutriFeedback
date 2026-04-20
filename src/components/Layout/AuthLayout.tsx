import { Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <Link
        to="/"
        className="mb-8 font-display text-2xl font-bold"
        style={{ color: 'var(--color-brand)' }}
      >
        {t('app.name')}
      </Link>

      <div
        className="w-full max-w-sm rounded-card p-8 shadow-card dark:shadow-card-dark"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <Outlet />
      </div>

      <div className="mt-6 flex gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <Link to="/terms" className="hover:underline">
          {t('nav.terms')}
        </Link>
        <Link to="/privacy" className="hover:underline">
          {t('nav.privacy')}
        </Link>
      </div>
    </div>
  );
}
