import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { SkeletonLoaderProps } from '@/types/components';

export function SkeletonLoader({ variant, lines = 3, className }: SkeletonLoaderProps) {
  const { t } = useTranslation();
  const lineCount = Math.min(5, Math.max(1, lines));

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t('common.loading')}
      className={cn(variant === 'card' && 'min-h-32', className)}
    >
      {variant === 'card' && (
        <div className="h-full min-h-32 w-full animate-pulse rounded-card bg-warm-100 dark:bg-warm-800" />
      )}
      {variant === 'avatar' && (
        <div className="h-10 w-10 animate-pulse rounded-full bg-warm-200 dark:bg-warm-700" />
      )}
      {variant === 'row' && (
        <div className="h-12 w-full animate-pulse rounded-lg bg-warm-100 dark:bg-warm-800" />
      )}
      {variant === 'text' && (
        <div className="flex w-full flex-col gap-2">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={cn(
                'h-3 animate-pulse rounded bg-warm-200 dark:bg-warm-700',
                i === lineCount - 1 ? 'w-[60%]' : 'w-full',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
