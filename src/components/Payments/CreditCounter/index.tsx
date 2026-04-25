import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { CreditCounterProps } from '@/types/components';

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / 86_400_000));
}

export function CreditCounter({ creditsRemaining, creditsExpiresAt }: CreditCounterProps) {
  const { t } = useTranslation();

  if (creditsExpiresAt === null) {
    return (
      <span
        aria-label={t('credits.unlimited')}
        title={t('credits.unlimited')}
        className="inline-flex items-center text-brand-500"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
        </svg>
      </span>
    );
  }

  const daysLeft = daysUntil(creditsExpiresAt);
  const showDaysHint = daysLeft <= 7;

  const countColor =
    creditsRemaining === 0
      ? 'text-red-500'
      : creditsRemaining <= 10
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-warm-700 dark:text-warm-200';

  const ariaLabel = t('credits.remaining', { count: creditsRemaining });

  return (
    <span aria-label={ariaLabel} className="inline-flex flex-col items-end leading-tight">
      <span
        className={cn(
          'inline-flex items-center rounded-pill border border-warm-300 bg-warm-100 px-2 py-0.5 font-mono text-xs dark:border-warm-600 dark:bg-warm-800',
          countColor,
        )}
      >
        {creditsRemaining}
      </span>
      {showDaysHint && (
        <span className="mt-0.5 text-xs text-warm-400">
          {daysLeft === 0 ? t('credits.expired') : t('credits.expiresIn', { count: daysLeft })}
        </span>
      )}
    </span>
  );
}
