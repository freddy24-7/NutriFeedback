import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function PrivacyPage() {
  const { t } = useTranslation();
  const date = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>
          {t('privacy.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/privacy`} />
      </Helmet>

      <article className="max-w-3xl" aria-label={t('privacy.title')}>
        <h1
          className="font-display text-display-md font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('privacy.title')}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('privacy.lastUpdated', { date })}
        </p>
        <div
          className="mt-4 rounded-card border p-4 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-light)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          role="note"
        >
          {t('privacy.reviewNotice')}
        </div>
        <ul className="mt-6 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <li>✓ {t('privacy.dataStorage')}</li>
          <li>✓ {t('privacy.dataExport')}</li>
          <li>✓ {t('privacy.noSell')}</li>
        </ul>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('privacy.placeholder')}
        </p>
      </article>
    </>
  );
}
