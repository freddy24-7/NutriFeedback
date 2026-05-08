import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProduct, useProductAdvice } from '@/hooks/useBarcode';
import { useUIStore } from '@/store/uiStore';
import { BarcodeScanner } from '@/components/Barcode/BarcodeScanner';
import { ProductCard } from '@/components/Barcode/ProductCard';
import { cn } from '@/utils/cn';

type Phase = 'intro' | 'scanning' | 'result';

const VERDICT_STYLE: Record<'good' | 'moderate' | 'caution', string> = {
  good: 'border-brand-400 bg-brand-50 dark:bg-brand-950',
  moderate: 'border-amber-400 bg-amber-50 dark:bg-amber-950',
  caution: 'border-red-400 bg-red-50 dark:bg-red-950',
};

const VERDICT_ICON: Record<'good' | 'moderate' | 'caution', string> = {
  good: '✓',
  moderate: '~',
  caution: '!',
};

const VERDICT_ICON_STYLE: Record<'good' | 'moderate' | 'caution', string> = {
  good: 'bg-brand-500 text-white',
  moderate: 'bg-amber-400 text-white',
  caution: 'bg-red-500 text-white',
};

interface ProductCheckModalProps {
  onClose: () => void;
}

export function ProductCheckModal({ onClose }: ProductCheckModalProps) {
  const { t } = useTranslation();
  const language = useUIStore((s) => s.language);
  const [phase, setPhase] = useState<Phase>('intro');
  const [barcode, setBarcode] = useState<string | null>(null);

  const { data: product, isLoading: isLookingUp, error: lookupError } = useProduct(barcode);
  const {
    data: advice,
    isLoading: isAdvising,
    error: adviceError,
  } = useProductAdvice(product !== undefined ? (barcode ?? null) : null, language);

  const handleScan = (code: string) => {
    setBarcode(code);
    setPhase('result');
  };

  const handleReset = () => {
    setBarcode(null);
    setPhase('intro');
  };

  // Scanner is fullscreen — render outside the modal card
  if (phase === 'scanning') {
    return <BarcodeScanner onScan={handleScan} onClose={() => setPhase('intro')} />;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('barcode.checkProduct')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="relative w-full max-w-sm rounded-card shadow-xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className={cn(
            'absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10',
          )}
          style={{ color: 'var(--color-text-muted)' }}
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

        {/* ── Intro phase ── */}
        {phase === 'intro' && (
          <div className="p-6 pt-10 space-y-4 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-accent-light)' }}
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--color-brand)' }}
                aria-hidden="true"
              >
                <path d="M3 5v4M3 5h4M21 5v4M21 5h-4M3 19v-4M3 19h4M21 19v-4M21 19h-4" />
                <rect x="7" y="7" width="10" height="10" rx="1" />
              </svg>
            </div>
            <h2
              className="font-display text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('barcode.checkProduct')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('barcode.checkProductDescription')}
            </p>
            <button
              type="button"
              onClick={() => setPhase('scanning')}
              className={cn(
                'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors',
                'bg-brand-700 hover:bg-brand-800',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
              )}
            >
              {t('barcode.startScanning')}
            </button>
          </div>
        )}

        {/* ── Result phase ── */}
        {phase === 'result' && (
          <div className="p-5 space-y-4">
            {/* Loading product */}
            {isLookingUp && (
              <p
                role="status"
                aria-live="polite"
                className="py-6 text-center text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {t('common.loading')}
              </p>
            )}

            {/* Lookup error */}
            {lookupError !== null && (
              <div className="space-y-3 py-4 text-center">
                <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                  {lookupError instanceof Error &&
                  lookupError.message.toLowerCase().includes('not found')
                    ? t('barcode.notFound')
                    : t('barcode.lookupError')}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('barcode.scanAgain')}
                </button>
              </div>
            )}

            {/* Product found */}
            {product !== undefined && (
              <>
                <ProductCard product={product} onDismiss={handleReset} />

                {/* AI advice */}
                {isAdvising && (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
                    style={{
                      backgroundColor: 'var(--color-accent-light)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <svg
                      className="h-4 w-4 shrink-0 animate-spin"
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
                    {t('barcode.generatingAdvice')}
                  </div>
                )}

                {advice !== undefined && (
                  <div
                    className={cn('rounded-lg border p-4 space-y-2', VERDICT_STYLE[advice.verdict])}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          VERDICT_ICON_STYLE[advice.verdict],
                        )}
                        aria-hidden="true"
                      >
                        {VERDICT_ICON[advice.verdict]}
                      </span>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {advice.headline}
                      </p>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {advice.body}
                    </p>
                  </div>
                )}

                {adviceError !== null && (
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {t('barcode.adviceUnavailable')}
                  </p>
                )}

                {/* Scan another */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-center text-sm underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {t('barcode.scanAnother')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
