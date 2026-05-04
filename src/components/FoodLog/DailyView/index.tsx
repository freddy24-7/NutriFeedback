import { useTranslation } from 'react-i18next';
import { useFoodLog } from '@/hooks/useFoodLog';
import { FoodEntryCard } from '@/components/FoodLog/FoodEntryCard';
import { EmptyState } from '@/components/UI/EmptyState';
import type { DailyViewProps } from '@/types/components';

export function DailyView({ date, onAddEntry }: DailyViewProps) {
  const { t } = useTranslation();
  const { data: entries, error } = useFoodLog(date);

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
      <EmptyState
        title={t('dashboard.noEntries')}
        subtitle={t('dashboard.noEntriesSubtitle')}
        action={
          onAddEntry !== undefined
            ? { label: t('dashboard.addEntry'), onClick: onAddEntry }
            : undefined
        }
      />
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
