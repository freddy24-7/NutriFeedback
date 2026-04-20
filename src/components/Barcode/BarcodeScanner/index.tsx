import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { cn } from '@/utils/cn';
import type { BarcodeScannerProps } from '@/types/components';

type ScannerState =
  | { phase: 'initialising' }
  | { phase: 'scanning' }
  | { phase: 'error'; messageKey: 'barcode.permissionDenied' | 'barcode.notSupported' };

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasFiredRef = useRef(false);

  const [state, setState] = useState<ScannerState>({ phase: 'initialising' });

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl === null) return;

    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (mediaDevices === undefined || typeof mediaDevices.getUserMedia !== 'function') {
      setState({ phase: 'error', messageKey: 'barcode.notSupported' });
      return;
    }

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoEl,
        (result, _err, controls) => {
          if (cancelled || hasFiredRef.current) return;
          if (result !== undefined) {
            hasFiredRef.current = true;
            controls.stop();
            onScan(result.getText());
          }
        },
      )
      .then((controls) => {
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setState({ phase: 'scanning' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        const key: 'barcode.permissionDenied' | 'barcode.notSupported' =
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'barcode.permissionDenied'
            : 'barcode.notSupported';
        setState({ phase: 'error', messageKey: key });
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      BrowserMultiFormatReader.releaseAllStreams();
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
        ref={closeButtonRef}
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
          'relative aspect-square w-full max-w-sm overflow-hidden rounded-card border-2 border-brand-400',
          state.phase === 'error' && 'border-red-400',
        )}
      >
        <video ref={videoRef} muted playsInline autoPlay className="h-full w-full object-cover">
          <track kind="captions" />
        </video>

        {state.phase === 'initialising' && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-black/50"
          >
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
          <div
            aria-hidden="true"
            className="absolute left-[10%] right-[10%] h-0.5 animate-scan-line bg-brand-400 opacity-75 shadow-[0_0_8px_rgba(87,186,134,0.8)]"
          />
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
    </div>
  );
}
