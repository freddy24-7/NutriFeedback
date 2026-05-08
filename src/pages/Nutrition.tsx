import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export function NutritionPage() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>
          {t('nutritionPage.title')} — {t('app.name')}
        </title>
        <meta name="description" content={t('nutritionPage.subtitle')} />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/nutrition`} />
      </Helmet>

      <article className="mx-auto max-w-2xl py-8 pb-16">
        {/* Page header */}
        <header className="mb-12 text-center">
          <h1
            className="font-display text-display-lg font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('nutritionPage.title')}
          </h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--color-text-secondary)' }}>
            {t('nutritionPage.subtitle')}
          </p>
          <p
            className="mt-6 text-base leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('nutritionPage.intro')}
          </p>
        </header>

        {/* Hero image — wide landscape shot of whole foods spread */}
        <figure className="mb-12 overflow-hidden rounded-card">
          <img
            src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248507/nutrition-hero_lvof3y.jpg`}
            alt="A colourful spread of whole foods including vegetables, fruits, legumes, and nuts"
            className="h-64 w-full object-cover sm:h-80"
            loading="eager"
          />
        </figure>

        <div className="space-y-14">
          {/* Section 1 — Real food first */}
          <Section
            title={t('nutritionPage.section1.title')}
            body={t('nutritionPage.section1.body')}
          />

          {/* Section 2 — Ultra-processed foods + image */}
          <Section
            title={t('nutritionPage.section2.title')}
            body={t('nutritionPage.section2.body')}
          >
            <figure className="mt-6 overflow-hidden rounded-card">
              <img
                src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248508/nutrition-processed_hl8voo.jpg`}
                alt="Side-by-side comparison of whole foods and packaged ultra-processed products"
                className="h-52 w-full object-cover sm:h-64"
                loading="lazy"
              />
              <figcaption
                className="mt-2 text-center text-sm italic"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('nutritionPage.section2.imageCaption')}
              </figcaption>
            </figure>
          </Section>

          {/* Section 3 — Calories + image */}
          <Section
            title={t('nutritionPage.section3.title')}
            body={t('nutritionPage.section3.body')}
          >
            <figure className="mt-6 overflow-hidden rounded-card">
              <img
                src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248506/nutrition-calories_yfauzo.jpg`}
                alt="Two equal-calorie meals showing very different nutritional quality"
                className="h-52 w-full object-cover sm:h-64"
                loading="lazy"
              />
              <figcaption
                className="mt-2 text-center text-sm italic"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('nutritionPage.section3.imageCaption')}
              </figcaption>
            </figure>
          </Section>

          {/* Section 4 — Protein */}
          <Section
            title={t('nutritionPage.section4.title')}
            body={t('nutritionPage.section4.body')}
          />

          {/* Protein sources image — portrait orientation, centred */}
          <figure className="overflow-hidden rounded-card">
            <img
              src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248509/nutrition-protein_gqtivs.jpg`}
              alt="A selection of high-protein whole foods: eggs, legumes, fish, chicken, tofu"
              className="mx-auto h-72 w-full max-w-sm object-cover sm:h-80"
              loading="lazy"
            />
          </figure>

          {/* Section 5 — Balance + image */}
          <Section
            title={t('nutritionPage.section5.title')}
            body={t('nutritionPage.section5.body')}
          >
            <figure className="mt-6 overflow-hidden rounded-card">
              <img
                src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248507/nutrition-balance_di76h1.jpg`}
                alt="A balanced meal on a table with a mix of vegetables, grains, and protein"
                className="h-52 w-full object-cover sm:h-64"
                loading="lazy"
              />
              <figcaption
                className="mt-2 text-center text-sm italic"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('nutritionPage.section5.imageCaption')}
              </figcaption>
            </figure>
          </Section>

          {/* Section 6 — Multiple diets */}
          <Section
            title={t('nutritionPage.section6.title')}
            body={t('nutritionPage.section6.body')}
          />

          {/* Section 7 — Intermittent fasting */}
          <Section
            title={t('nutritionPage.section7.title')}
            body={t('nutritionPage.section7.body')}
          />

          {/* IF / meal timing image */}
          <figure className="overflow-hidden rounded-card">
            <img
              src={`${import.meta.env['VITE_CLOUDINARY_BASE_URL']}/v1778248507/nutrition-fasting_mdmmbb.jpg`}
              alt="A simple plate of food next to a clock representing time-restricted eating"
              className="h-52 w-full object-cover sm:h-64"
              loading="lazy"
            />
          </figure>

          {/* Section 8 — Phone scanner + NOVA scores */}
          <section>
            <h2
              className="font-display text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('nutritionPage.section8.title')}
            </h2>
            <p
              className="mt-3 text-base leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('nutritionPage.section8.body')}
            </p>

            <h3
              className="mt-8 font-display text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('nutritionPage.section8.novaTitle')}
            </h3>
            <p
              className="mt-2 text-base leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('nutritionPage.section8.novaBody')}
            </p>

            <ul className="mt-5 space-y-4">
              {(
                [
                  {
                    key: 'nova1',
                    squares: ['bg-brand-500', 'bg-brand-500', 'bg-brand-500', 'bg-brand-500'],
                  },
                  {
                    key: 'nova2',
                    squares: [
                      'bg-brand-500',
                      'bg-brand-500',
                      'bg-warm-300 dark:bg-warm-600',
                      'bg-warm-300 dark:bg-warm-600',
                    ],
                  },
                  {
                    key: 'nova3',
                    squares: [
                      'bg-amber-400',
                      'bg-amber-400',
                      'bg-amber-400',
                      'bg-warm-300 dark:bg-warm-600',
                    ],
                  },
                  {
                    key: 'nova4',
                    squares: ['bg-red-500', 'bg-red-500', 'bg-red-500', 'bg-red-500'],
                  },
                ] as const
              ).map(({ key, squares }) => (
                <li key={key} className="flex items-start gap-3">
                  <div className="mt-1 flex shrink-0 gap-1" aria-hidden="true">
                    {squares.map((cls, i) => (
                      <span key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
                    ))}
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {t(`nutritionPage.section8.${key}`)}
                  </p>
                </li>
              ))}
            </ul>

            <p
              className="mt-5 text-sm leading-relaxed italic"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {t('nutritionPage.section8.novaConclusion')}
            </p>
          </section>

          {/* Closing */}
          <div
            className="rounded-card border p-8 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2
              className="font-display text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('nutritionPage.closing.title')}
            </h2>
            <p
              className="mt-4 text-base leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('nutritionPage.closing.body')}
            </p>
          </div>
        </div>
      </article>
    </>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <p
        className="mt-3 text-base leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {body}
      </p>
      {children}
    </section>
  );
}
