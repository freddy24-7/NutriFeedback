import { useTranslation } from 'react-i18next';
import { useStartCheckout } from '@/hooks/useSubscription';
import { SubscriptionStatusBadge } from '@/components/Payments/SubscriptionStatusBadge';
import { CreditCounter } from '@/components/Payments/CreditCounter';
import { DiscountCodeInput } from '@/components/Payments/DiscountCodeInput';
import { cn } from '@/utils/cn';
import type { PricingCardProps } from '@/types/components';

export function PricingCard({ subscription, priceId, priceDisplay }: PricingCardProps) {
  const { t } = useTranslation();
  const { mutate: startCheckout, isPending } = useStartCheckout();

  const isAllSet = subscription.status === 'active' || subscription.status === 'comped';
  const showCreditCounter = subscription.status === 'trial';

  const handleUpgrade = () => {
    startCheckout({ priceId });
  };

  return (
    <div className="relative mx-auto w-full max-w-sm rounded-card border border-warm-200 bg-white p-8 text-center shadow-card dark:border-warm-700 dark:bg-warm-900">
      <div className="absolute right-4 top-4">
        <SubscriptionStatusBadge status={subscription.status} />
      </div>

      <h2 className="font-display text-2xl font-bold text-warm-900 dark:text-warm-100">
        {t('pricing.planName')}
      </h2>

      <p className="mt-3 text-4xl font-bold text-brand-700 dark:text-brand-400">{priceDisplay}</p>

      <ul className="mt-6 space-y-3 text-left">
        {(['unlimited', 'aiTips', 'barcode'] as const).map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-warm-700 dark:text-warm-300">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{t(`pricing.feature.${key}`)}</span>
          </li>
        ))}
      </ul>

      {showCreditCounter && (
        <div className="mt-6 flex justify-center">
          <CreditCounter
            creditsRemaining={subscription.creditsRemaining}
            creditsExpiresAt={subscription.creditsExpiresAt}
          />
        </div>
      )}

      <div className="mt-6">
        {isAllSet ? (
          <p className="font-display font-semibold text-brand-700 dark:text-brand-400">
            {t('pricing.alreadyActive')}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={isPending}
            aria-label={t('pricing.upgrade')}
            className={cn(
              'flex w-full items-center justify-center rounded-pill bg-brand-700 px-6 py-3 text-lg font-medium text-white transition-colors',
              'hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
          >
            {isPending ? (
              <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
            ) : (
              t('pricing.upgrade')
            )}
          </button>
        )}
      </div>

      {!isAllSet && (
        <div className="mt-4">
          <DiscountCodeInput />
        </div>
      )}
    </div>
  );
}
