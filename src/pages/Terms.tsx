import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function TermsPage() {
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
          {t('terms.title')} — {t('app.name')}
        </title>
      </Helmet>

      <article className="prose max-w-3xl" aria-label={t('terms.title')}>
        <h1
          className="font-display text-display-md font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('terms.title')}
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('terms.lastUpdated', { date })}
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
          {t('terms.reviewNotice')}
        </div>
        <p className="mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          {t('terms.placeholder')}
        </p>
      </article>
    </>
  );
}
