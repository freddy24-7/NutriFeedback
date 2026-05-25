import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { DesktopInstallBannerProps } from '@/types/components';

export function DesktopInstallBanner({ appUrl, onDismiss }: DesktopInstallBannerProps) {
  const { t } = useTranslation();

  return (
    <div
      role="region"
      aria-label={t('pwa.desktopBanner.title')}
      className={cn(
        'flex items-center gap-6 rounded-2xl border p-5',
        'bg-gradient-to-r from-brand-50 to-white dark:from-brand-950/40 dark:to-warm-900',
        'border-brand-200 dark:border-brand-800',
        'shadow-sm',
      )}
    >
      {/* QR code */}
      <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm dark:bg-warm-800">
        <QRCodeSVG
          value={appUrl}
          size={88}
          bgColor="transparent"
          fgColor="currentColor"
          className="text-warm-900 dark:text-white"
          level="M"
        />
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className="font-display font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('pwa.desktopBanner.title')}
            </p>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('pwa.desktopBanner.description')}
            </p>
            <p
              className="mt-2 text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('pwa.desktopBanner.scanPrompt')}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('pwa.desktopBanner.dismiss')}
            className={cn(
              'shrink-0 rounded-full p-1.5 transition-colors',
              'hover:bg-black/5 dark:hover:bg-white/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            )}
            style={{ color: 'var(--color-text-secondary)' }}
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
        </div>
      </div>
    </div>
  );
}
