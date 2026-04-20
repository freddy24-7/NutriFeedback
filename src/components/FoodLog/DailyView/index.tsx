import { useTranslation } from 'react-i18next';
import { useFoodLog, useDeleteFoodEntry } from '@/hooks/useFoodLog';
import { cn } from '@/utils/cn';
import type { DailyViewProps } from '@/types/components';
import type { FoodLogEntry } from '@/lib/db/schema';
import type { MealType } from '@/types/api';

const MEAL_TYPE_KEYS = ['breakfast', 'lunch', 'dinner', 'snack', 'drink'] as const;

function isMealType(value: string | null): value is MealType {
  return value !== null && (MEAL_TYPE_KEYS as readonly string[]).includes(value);
}

function EntryRow({ entry, onDelete }: { entry: FoodLogEntry; onDelete: () => void }) {
  const { t } = useTranslation();
  const mealType = entry.mealType;

  return (
    <li
      className="flex items-start justify-between gap-4 rounded-card px-4 py-3 shadow-card dark:shadow-card-dark"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {entry.description}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {isMealType(mealType) && (
            <span
              className="inline-flex rounded-pill px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: `var(--color-${mealType})` }}
            >
              {t(`foodLog.mealType.${mealType}`)}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {t(`foodLog.source.${entry.source}`)}
          </span>
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label={t('foodLog.deleteEntry')}
        className={cn(
          'shrink-0 rounded-lg p-1 text-xs transition-colors',
          'hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950',
        )}
        style={{ color: 'var(--color-text-muted)' }}
      >
        ✕
      </button>
    </li>
  );
}

export function DailyView({ userId, date, onAddEntry }: DailyViewProps) {
  const { t } = useTranslation();
  const { data: entries, isLoading, error } = useFoodLog(date);
  const { mutate: deleteEntry } = useDeleteFoodEntry();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="py-8 text-center text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {t('common.loading')}
      </div>
    );
  }

  if (error !== null) {
    return (
      <div
        role="alert"
        className="py-8 text-center text-sm"
        style={{ color: 'var(--color-error)' }}
      >
        {t('common.error')}
      </div>
    );
  }

  if (entries === undefined || entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {t('dashboard.noEntries')}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('dashboard.noEntriesSubtitle')}
        </p>
        <button
          onClick={onAddEntry}
          className="mt-4 rounded-pill bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
        >
          {t('dashboard.addEntry')}
        </button>
      </div>
    );
  }

  return (
    <section aria-label={t('dashboard.todayLog')}>
      <ul className="space-y-3" aria-label={t('dashboard.todayLog')}>
        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onDelete={() => deleteEntry({ id: entry.id, date })}
          />
        ))}
      </ul>
      <p className="mt-4 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {userId.slice(0, 8)}
      </p>
    </section>
  );
}
