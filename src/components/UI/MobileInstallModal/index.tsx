import { useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { usePWAStore } from '@/store/pwaStore';
import { cn } from '@/utils/cn';
import type { MobileInstallModalProps } from '@/types/components';

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function MobileInstallModal({ isOpen, onDismiss }: MobileInstallModalProps) {
  const { t } = useTranslation();
  const { deferredPrompt, triggerInstall } = usePWAStore();
  const ios = isIOS();
  const canInstallNatively = deferredPrompt !== null && !ios;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const handleInstall = async () => {
    await triggerInstall();
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-install-title"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          'relative w-full rounded-t-2xl sm:max-w-sm sm:rounded-2xl',
          'bg-white dark:bg-warm-900',
          'p-6 shadow-2xl',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        )}
      >
        {/* App icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-xl font-bold text-white shadow-lg">
          N
        </div>

        <h2
          id="mobile-install-title"
          className="text-center font-display text-lg font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('pwa.mobileModal.title')}
        </h2>

        <p
          className="mt-2 text-center text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('pwa.mobileModal.description')}
        </p>

        <div className="mt-6 space-y-3">
          {canInstallNatively && (
            <button
              type="button"
              onClick={() => void handleInstall()}
              className={cn(
                'w-full rounded-pill bg-brand-700 py-3 text-sm font-semibold text-white',
                'transition-colors hover:bg-brand-800',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              )}
            >
              {t('pwa.mobileModal.addButton')}
            </button>
          )}

          {ios && (
            <p
              className="rounded-xl border px-4 py-3 text-center text-sm leading-relaxed"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <Trans
                i18nKey="pwa.mobileModal.iosInstructions"
                components={{
                  share: (
                    // iOS share icon inline
                    <svg
                      className="inline-block h-4 w-4 align-text-bottom"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  ),
                  bold: <strong />,
                }}
              />
            </p>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'w-full rounded-pill py-3 text-sm font-medium',
              'transition-colors hover:bg-black/5 dark:hover:bg-white/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('pwa.mobileModal.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
