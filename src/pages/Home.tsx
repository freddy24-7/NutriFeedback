import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/utils/cn';

export function HomePage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t('app.name')} — {t('app.tagline')}
        </title>
        <meta name="description" content={t('home.hero.subtitle')} />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${t('app.name')} — ${t('app.tagline')}`} />
        <meta property="og:description" content={t('home.hero.subtitle')} />
        <meta property="og:url" content={`${import.meta.env['VITE_APP_URL'] ?? ''}/`} />
        <meta
          property="og:image"
          content={`${import.meta.env['VITE_APP_URL'] ?? ''}/og-image.png`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${t('app.name')} — ${t('app.tagline')}`} />
        <meta name="twitter:description" content={t('home.hero.subtitle')} />
        <meta
          name="twitter:image"
          content={`${import.meta.env['VITE_APP_URL'] ?? ''}/og-image.png`}
        />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'NutriApp',
            applicationCategory: 'HealthApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '4.99',
              priceCurrency: 'EUR',
            },
            description: t('home.hero.subtitle'),
            url: import.meta.env['VITE_APP_URL'] ?? '',
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="py-16 text-center">
        <h1
          className="font-display text-display-lg font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('home.hero.title')}
        </h1>
        <p
          className="mx-auto mt-4 max-w-xl text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('home.hero.subtitle')}
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('home.freeCredits')}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className={cn(
              'rounded-pill px-8 py-3 font-display font-semibold text-white transition-colors duration-150',
              'bg-brand-700 hover:bg-brand-800 dark:bg-brand-400 dark:hover:bg-brand-300',
            )}
          >
            {t('home.hero.cta')}
          </Link>
          <Link to="/signin" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('home.hero.signIn')}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <h2
          className="mb-8 text-center font-display text-display-md font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('home.features.title')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {(['flexible', 'ai', 'bilingual'] as const).map((key) => (
            <div
              key={key}
              className="rounded-card p-6 shadow-card dark:shadow-card-dark"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3
                className="font-display font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {t(`home.features.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {t(`home.features.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
