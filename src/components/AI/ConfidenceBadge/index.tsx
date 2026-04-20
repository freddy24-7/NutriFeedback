import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { ConfidenceBadgeProps } from '@/types/components';

type Tier = 'high' | 'medium' | 'low';

const TIER_BADGE: Record<Tier, string> = {
  high: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  low: 'bg-warm-200 text-warm-600 dark:bg-warm-700 dark:text-warm-300',
};

const TIER_DOT: Record<Tier, string> = {
  high: 'bg-brand-500',
  medium: 'bg-amber-500',
  low: 'bg-warm-400',
};

function tierFor(confidence: number): Tier {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  const tier = tierFor(confidence);
  const labelText = t(`nutrients.confidence.${tier}`);
  const ariaLabel = `${t('nutrients.confidence.label')}: ${labelText}`;

  return (
    <span
      aria-label={ariaLabel}
      title={labelText}
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium',
        TIER_BADGE[tier],
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', TIER_DOT[tier])} />
      {labelText}
    </span>
  );
}
