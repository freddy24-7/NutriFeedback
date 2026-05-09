import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { CreditCounterProps } from '@/types/components';

const TOTAL_CREDITS = 25;
const SEGMENTS = 5;

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
        role="img"
        aria-label={t('credits.unlimited')}
        title={t('credits.unlimited')}
        className="inline-flex items-center text-brand-700 dark:text-brand-400"
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

  // How many segments to fill (out of SEGMENTS), proportional to remaining credits
  const ratio = Math.min(creditsRemaining / TOTAL_CREDITS, 1);
  const filledSegments = Math.ceil(ratio * SEGMENTS);

  const isEmpty = creditsRemaining === 0;
  const isLow = creditsRemaining <= 5;

  const filledColor = isEmpty ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-brand-500';

  const ariaLabel = t('credits.remaining', { count: creditsRemaining });

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className="inline-flex flex-col items-end gap-0.5"
    >
      {/* Battery icon with segmented fill */}
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {/* Battery body */}
        <span className="inline-flex items-center gap-px rounded-sm border border-warm-400 dark:border-warm-500 p-px">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-3 w-2 rounded-sm transition-colors duration-300',
                i < filledSegments ? filledColor : 'bg-warm-200 dark:bg-warm-700',
              )}
            />
          ))}
        </span>
        {/* Battery tip */}
        <span className="h-1.5 w-1 rounded-r-sm bg-warm-400 dark:bg-warm-500" />
      </span>

      {showDaysHint && (
        <span className="text-xs text-warm-400">
          {daysLeft === 0 ? t('credits.expired') : t('credits.expiresIn', { count: daysLeft })}
        </span>
      )}
    </span>
  );
}
