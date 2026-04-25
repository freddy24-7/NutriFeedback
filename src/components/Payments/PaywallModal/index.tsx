import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useStartCheckout } from '@/hooks/useSubscription';
import { DiscountCodeInput } from '@/components/Payments/DiscountCodeInput';
import { cn } from '@/utils/cn';
import type { PaywallModalProps } from '@/types/components';

export function PaywallModal({ isOpen, onClose, reason = 'no_credits' }: PaywallModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const { mutate: startCheckout, isPending } = useStartCheckout();

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
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

  const handleUpgrade = () => {
    const priceId = import.meta.env['VITE_STRIPE_PRICE_ID'] as string | undefined;
    if (priceId === undefined || priceId === '') return;
    startCheckout({ priceId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        className={cn(
          'relative w-full max-w-md rounded-card bg-white p-6 shadow-xl dark:bg-warm-900',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-300"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </span>
          <h2
            id={titleId}
            className="flex-1 pt-1.5 font-display text-xl font-semibold text-warm-900 dark:text-warm-100"
          >
            {t(`paywall.title.${reason}`)}
          </h2>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-warm-700 dark:text-warm-300">
          {t(`paywall.body.${reason}`)}
        </p>

        <div className="mt-5">
          <DiscountCodeInput onSuccess={() => onClose()} />
        </div>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-warm-200 dark:bg-warm-700" />
          <span className="text-xs text-warm-400">{t('paywall.or')}</span>
          <span className="h-px flex-1 bg-warm-200 dark:bg-warm-700" />
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleUpgrade}
          disabled={isPending}
          className={cn(
            'flex w-full items-center justify-center rounded-pill bg-brand-500 px-6 py-3 text-center font-medium text-white transition-colors',
            'hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60',
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
            t('paywall.upgrade')
          )}
        </button>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'text-sm text-warm-400 underline transition-colors hover:text-warm-600 dark:hover:text-warm-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded',
            )}
          >
            {t('paywall.skip')}
          </button>
        </div>
      </div>
    </div>
  );
}
