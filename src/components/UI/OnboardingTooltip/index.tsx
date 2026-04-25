import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { OnboardingTooltipProps } from '@/types/components';

const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;

function Arrow({ anchor }: { anchor: OnboardingTooltipProps['anchor'] }) {
  switch (anchor) {
    case 'bottom':
      return (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-[6px] border-b-[8px] border-x-transparent border-b-brand-600"
        />
      );
    case 'top':
      return (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 translate-y-full border-x-[6px] border-t-[8px] border-x-transparent border-t-brand-600"
        />
      );
    case 'left':
      return (
        <div
          aria-hidden="true"
          className="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 translate-x-full border-y-[6px] border-l-[8px] border-y-transparent border-l-brand-600"
        />
      );
    case 'right':
      return (
        <div
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2 -translate-x-full border-y-[6px] border-r-[8px] border-y-transparent border-r-brand-600"
        />
      );
    default:
      return null;
  }
}

function positionClasses(anchor: OnboardingTooltipProps['anchor']): string {
  switch (anchor) {
    case 'bottom':
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 'top':
      return 'bottom-full left-1/2 mb-2 -translate-x-1/2';
    case 'left':
      return 'right-full top-1/2 mr-2 -translate-y-1/2';
    case 'right':
      return 'left-full top-1/2 ml-2 -translate-y-1/2';
    default:
      return '';
  }
}

export function OnboardingTooltip({
  step,
  anchor,
  isVisible,
  onDismiss,
  onNext,
}: OnboardingTooltipProps) {
  const { t } = useTranslation();
  const stepKey = STEP_KEYS[step - 1];

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  const isFinal = onNext === undefined;

  return (
    <div
      role="tooltip"
      aria-live="polite"
      className={cn('absolute z-50 max-w-xs', positionClasses(anchor))}
    >
      <div className="relative rounded-lg bg-brand-600 p-4 pt-8 text-sm text-white shadow-xl">
        <Arrow anchor={anchor} />
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.close')}
          className={cn(
            'absolute right-2 top-2 rounded p-1 opacity-60 transition-opacity hover:opacity-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
          )}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <p className="text-xs opacity-75">{t('howToUse.progress', { current: step, total: 4 })}</p>
        <h3 className="mt-1 font-display font-semibold">{t(`howToUse.${stepKey}.title`)}</h3>
        <p className="mt-2 leading-relaxed opacity-95">{t(`howToUse.${stepKey}.description`)}</p>

        <div className="mt-4 flex justify-end gap-2">
          {!isFinal && (
            <button
              type="button"
              onClick={onNext}
              className={cn(
                'rounded-pill bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition-colors',
                'hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
              )}
            >
              {t('howToUse.next')}
            </button>
          )}
          {isFinal && (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'rounded-pill bg-white/20 px-4 py-1.5 text-sm font-medium text-white transition-colors',
                'hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
              )}
            >
              {t('howToUse.gotIt')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
