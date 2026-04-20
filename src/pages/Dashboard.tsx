import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';
import { todayISO, formatDate } from '@/utils/date';
import { DailyView } from '@/components/FoodLog/DailyView';
import { FoodEntryForm } from '@/components/FoodLog/FoodEntryForm';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = authClient.useSession();
  const [date, setDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);

  const displayDate = formatDate(date, i18n.language);

  if (!session?.user) return null;

  return (
    <>
      <Helmet>
        <title>
          {t('dashboard.title')} — {t('app.name')}
        </title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="font-display text-display-md font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('dashboard.todayLog')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {displayDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
              max={todayISO()}
              aria-label={t('dashboard.viewDate')}
              className="rounded-lg border px-2 py-1 text-sm outline-none focus:border-brand-500"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-pill bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              {showForm ? t('common.cancel') : t('dashboard.addEntry')}
            </button>
          </div>
        </div>

        {showForm && <FoodEntryForm defaultDate={date} onSuccess={() => setShowForm(false)} />}

        <DailyView userId={session.user.id} date={date} onAddEntry={() => setShowForm(true)} />
      </div>
    </>
  );
}
