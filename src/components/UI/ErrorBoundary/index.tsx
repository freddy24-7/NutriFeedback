// Error boundaries must be class components — Fast Refresh doesn't support them.
/* eslint-disable react-refresh/only-export-components */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import type { ErrorBoundaryProps } from '@/types/components';

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

function ErrorBoundaryDefaultFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="alert"
      className="mx-auto mt-16 max-w-sm rounded-card border border-warm-200 bg-warm-50 p-8 text-center dark:border-warm-700 dark:bg-warm-800"
    >
      <div className="mb-4 text-4xl text-red-400" aria-hidden="true">
        <svg className="mx-auto h-14 w-14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display font-semibold text-warm-900 outline-none dark:text-warm-100"
      >
        {t('common.error')}
      </h1>
      <p className="mt-2 text-sm text-warm-500">{t('errorBoundary.hint')}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/dashboard"
          className={cn(
            'inline-block rounded-pill bg-brand-700 px-5 py-2 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {t('nav.dashboard')}
        </a>
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'rounded-pill border border-warm-300 bg-transparent px-5 py-2 text-sm font-medium text-warm-800 transition-colors',
            'hover:bg-warm-100 dark:border-warm-600 dark:text-warm-100 dark:hover:bg-warm-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    const { children, fallback } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      if (fallback !== undefined) {
        return fallback;
      }
      return <ErrorBoundaryDefaultFallback onRetry={this.handleRetry} />;
    }

    return children;
  }
}
