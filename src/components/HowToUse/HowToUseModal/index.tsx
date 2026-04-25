import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { HowToUseModalProps } from '@/types/components';

const STEPS = ['step1', 'step2', 'step3', 'step4'] as const;

const STEP_ICONS: Record<(typeof STEPS)[number], string> = {
  step1: '📝',
  step2: '📷',
  step3: '💡',
  step4: '📅',
};

export function HowToUseModal({ isOpen, onClose }: HowToUseModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (dialog === null) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 md:items-center md:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={t('howToUse.title')}
        className={cn(
          'relative flex h-full w-full flex-col overflow-y-auto bg-white p-6 shadow-xl dark:bg-warm-900',
          'md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-card',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-display text-xl font-semibold text-warm-900 dark:text-warm-100"
          >
            {t('howToUse.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('howToUse.close')}
            className={cn(
              'shrink-0 rounded-full p-1.5 text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-700',
              'dark:hover:bg-warm-800 dark:hover:text-warm-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <ol className="mt-6 space-y-5">
          {STEPS.map((step, idx) => {
            const number = idx + 1;
            return (
              <li key={step} className="flex items-start gap-4">
                <span
                  aria-label={t('howToUse.stepLabel', { number })}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-display text-base font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200"
                >
                  {number}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 font-display text-base font-semibold text-warm-900 dark:text-warm-100">
                    <span aria-hidden="true">{STEP_ICONS[step]}</span>
                    <span>{t(`howToUse.${step}.title`)}</span>
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-warm-700 dark:text-warm-300">
                    {t(`howToUse.${step}.description`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
