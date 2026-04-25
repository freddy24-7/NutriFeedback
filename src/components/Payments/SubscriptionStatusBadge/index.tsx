import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { SubscriptionStatusBadgeProps } from '@/types/components';
import type { SubscriptionStatus } from '@/types/api';

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  trial: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  active: 'bg-brand-700 text-white',
  comped: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  expired: 'bg-warm-200 text-warm-500 dark:bg-warm-700 dark:text-warm-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const { t } = useTranslation();
  const label = t(`subscription.status.${status}`);

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
      )}
    >
      {status === 'comped' && (
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 22 12 17.27 5.79 22l2.39-8.15L2 9.36h7.61L12 2z" />
        </svg>
      )}
      {label}
    </span>
  );
}
