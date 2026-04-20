import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { AiTipCardProps } from '@/types/components';
import type { AiTipResponse } from '@/types/api';

type Severity = AiTipResponse['severity'];

const SEVERITY_BORDER: Record<Severity, string> = {
  info: 'border-brand-400',
  suggestion: 'border-amber-400',
  important: 'border-red-400',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  info: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  suggestion: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  important: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function AiTipCard({ tip, language, onDismiss, isDismissing = false }: AiTipCardProps) {
  const { t } = useTranslation();

  const text = language === 'nl' ? tip.tipTextNl : tip.tipTextEn;
  const severityLabel = t(`ai.tip.severity.${tip.severity}`);

  return (
    <article
      className={cn(
        'relative rounded-card border-l-4 bg-warm-50 p-4 shadow-card transition-opacity duration-300 dark:bg-warm-800',
        SEVERITY_BORDER[tip.severity],
        isDismissing && 'pointer-events-none opacity-50',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-label={severityLabel}
          className={cn(
            'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
            SEVERITY_BADGE[tip.severity],
          )}
        >
          {severityLabel}
        </span>

        <button
          type="button"
          onClick={() => onDismiss(tip.id)}
          disabled={isDismissing}
          aria-label={t('ai.tip.dismiss')}
          className={cn(
            'shrink-0 rounded-full p-1 text-warm-400 transition-colors hover:text-warm-700 dark:hover:text-warm-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {isDismissing ? (
            <svg
              className="h-4 w-4 animate-spin"
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
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-warm-800 dark:text-warm-100">{text}</p>
    </article>
  );
}
