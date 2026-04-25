import { cn } from '@/utils/cn';
import type { EmptyStateProps } from '@/types/components';

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-12 text-center"
    >
      {icon !== undefined && (
        <div className="text-5xl text-warm-300 dark:text-warm-600" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="font-display text-lg font-semibold text-warm-700 dark:text-warm-200">
        {title}
      </h2>
      {subtitle !== undefined && (
        <p className="max-w-xs text-sm text-warm-400 dark:text-warm-500">{subtitle}</p>
      )}
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className={cn(
            'rounded-pill bg-brand-700 px-5 py-2.5 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
