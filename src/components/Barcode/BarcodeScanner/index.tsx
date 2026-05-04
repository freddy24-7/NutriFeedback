import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { BarcodeScannerProps } from '@/types/components';

type ScannerState =
  | { phase: 'initialising' }
  | { phase: 'scanning' }
  | {
      phase: 'error';
      messageKey: 'barcode.permissionDenied' | 'barcode.notSupported';
      debugInfo?: string;
    };

const SCANNER_ID = 'html5-qrcode-scanner';

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasFiredRef = useRef(false);
  const [state, setState] = useState<ScannerState>({ phase: 'initialising' });

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
    scannerRef.current = scanner;

    const tryStart = (facingMode: string | undefined) =>
      scanner.start(
        facingMode ? { facingMode } : { deviceId: { exact: 'default' } },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Wide scan box — barcodes are landscape, give the decoder as much width as possible
            const w = Math.floor(viewfinderWidth * 0.95);
            const h = Math.floor(Math.min(viewfinderHeight * 0.4, 200));
            return { width: w, height: h };
          },
          aspectRatio: 1.7,
          // Prefer higher resolution for barcode readability
          videoConstraints: {
            facingMode: facingMode ?? 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        (text) => {
          if (hasFiredRef.current) return;
          hasFiredRef.current = true;
          onScan(text);
          void scanner.stop().catch(() => undefined);
        },
        () => {
          /* per-frame decode errors are normal */
        },
      );

    tryStart('environment')
      .catch(() => tryStart(undefined))
      .then(() => setState({ phase: 'scanning' }))
      .catch((err: unknown) => {
        const name = err instanceof Error ? err.name : String(err);
        const message = err instanceof Error ? err.message : '';
        const stack = err instanceof Error ? (err.stack ?? '') : '';
        const key: 'barcode.permissionDenied' | 'barcode.notSupported' =
          name === 'NotAllowedError' || name === 'SecurityError' || name === 'NotReadableError'
            ? 'barcode.permissionDenied'
            : 'barcode.notSupported';
        setState({
          phase: 'error',
          messageKey: key,
          debugInfo: `${name}: ${message} | ${stack.split('\n')[1] ?? ''}`,
        });
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().catch(() => undefined);
      }
      scannerRef.current = null;
    };
  }, [onScan]);

  const statusText =
    state.phase === 'initialising'
      ? t('barcode.scanning')
      : state.phase === 'scanning'
        ? t('barcode.pointCamera')
        : t(state.messageKey);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('barcode.scanning')}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('barcode.close')}
        className={cn(
          'absolute right-4 top-4 rounded-full p-2 text-white transition-colors hover:text-warm-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        )}
      >
        <svg
          className="h-6 w-6"
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

      <div
        className={cn(
          'relative w-full max-w-sm rounded-card border-2',
          state.phase === 'error' ? 'border-red-400' : 'border-brand-400',
        )}
        style={{ minHeight: 300 }}
      >
        {/* html5-qrcode mounts the video feed into this div */}
        <div id={SCANNER_ID} className="w-full" style={{ minHeight: 300 }} />

        {state.phase === 'initialising' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <svg
              className="h-8 w-8 animate-spin text-white"
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
          </div>
        )}

        {state.phase === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-4/5" style={{ height: '40%' }}>
              <div className="animate-scan-line absolute left-0 right-0 h-0.5 bg-brand-400 shadow-[0_0_10px_3px_rgba(87,186,134,0.7)]" />
            </div>
          </div>
        )}
      </div>

      <p
        role={state.phase === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={cn(
          'mt-6 text-center text-sm font-medium',
          state.phase === 'error' ? 'text-red-300' : 'text-white',
        )}
      >
        {statusText}
      </p>
      {state.phase === 'error' && state.debugInfo && (
        <p className="mt-2 max-w-xs break-all text-center text-xs text-white/50">
          {state.debugInfo}
        </p>
      )}
    </div>
  );
}
