import { useTranslation } from 'react-i18next';
import { useFoodLog } from '@/hooks/useFoodLog';
import { FoodEntryCard } from '@/components/FoodLog/FoodEntryCard';
import type { DailyViewProps } from '@/types/components';

export function DailyView({ date, onAddEntry }: DailyViewProps) {
  const { t } = useTranslation();
  const { data: entries, isLoading, error } = useFoodLog(date);

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
          <li key={entry.id}>
            <FoodEntryCard entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}
