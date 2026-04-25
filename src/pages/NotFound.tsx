import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>404 — {t('app.name')}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-data text-6xl font-medium" style={{ color: 'var(--color-brand)' }}>
          404
        </p>
        <h1
          className="mt-4 font-display text-xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('errors.notFound')}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('errors.notFoundSubtitle')}
        </p>
        <Link
          to="/"
          className="mt-6 rounded-pill px-6 py-2 text-sm font-medium text-white bg-brand-700 hover:bg-brand-800 transition-colors"
        >
          {t('errors.goHome')}
        </Link>
      </div>
    </>
  );
}
