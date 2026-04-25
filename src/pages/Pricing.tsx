import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingCard } from '@/components/Payments/PricingCard';
import { SkeletonLoader } from '@/components/UI/SkeletonLoader';

const PRICE_ID = (import.meta.env['VITE_STRIPE_PRICE_ID'] as string | undefined) ?? '';
const PRICE_DISPLAY = '€4.99 / month';

export function PricingPage() {
  const { t } = useTranslation();
  const { data: subscription, isLoading } = useSubscription();

  return (
    <>
      <Helmet>
        <title>
          {t('pricing.planName')} — {t('app.name')}
        </title>
        <meta name="description" content={t('pricing.description')} />
        <link rel="canonical" href={`${import.meta.env['VITE_APP_URL'] ?? ''}/pricing`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${t('pricing.planName')} — ${t('app.name')}`} />
        <meta property="og:description" content={t('pricing.description')} />
        <meta property="og:url" content={`${import.meta.env['VITE_APP_URL'] ?? ''}/pricing`} />
      </Helmet>

      <div className="flex min-h-[60vh] flex-col items-center justify-center py-12">
        <h1 className="mb-8 font-display text-3xl font-bold text-warm-900 dark:text-warm-100">
          {t('pricing.planName')}
        </h1>

        {isLoading || subscription === undefined ? (
          <SkeletonLoader variant="card" className="h-64 w-80" />
        ) : (
          <PricingCard
            subscription={subscription}
            priceId={PRICE_ID}
            priceDisplay={PRICE_DISPLAY}
          />
        )}
      </div>
    </>
  );
}
