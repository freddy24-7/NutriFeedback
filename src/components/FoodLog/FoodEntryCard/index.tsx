import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeleteFoodEntry } from '@/hooks/useFoodLog';
import { MealTypeBadge } from '@/components/FoodLog/MealTypeBadge';
import { ConfidenceBadge } from '@/components/AI/ConfidenceBadge';
import { NutrientMiniChart } from '@/components/AI/NutrientMiniChart';
import { cn } from '@/utils/cn';
import { ParsedNutrientsSchema } from '@/types/api';
import type { FoodEntryCardProps } from '@/types/components';
import type { MealType } from '@/types/api';

const MEAL_BORDER: Record<MealType, string> = {
  breakfast: 'border-brand-500',
  lunch: 'border-amber-400',
  dinner: 'border-brand-700',
  snack: 'border-warm-400',
  drink: 'border-warm-300',
};

function isMealType(value: string | null): value is MealType {
  return (
    value === 'breakfast' ||
    value === 'lunch' ||
    value === 'dinner' ||
    value === 'snack' ||
    value === 'drink'
  );
}

function formatTime(date: Date, language: string): string {
  const locale = language === 'nl' ? 'nl-NL' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function FoodEntryCard({ entry, onDelete }: FoodEntryCardProps) {
  const { t, i18n } = useTranslation();
  const { mutate, isPending } = useDeleteFoodEntry();
  const [showNutrients, setShowNutrients] = useState(false);

  const mealType = entry.mealType;
  const borderClass = isMealType(mealType) ? MEAL_BORDER[mealType] : 'border-warm-300';
  const time = formatTime(new Date(entry.createdAt), i18n.language);

  const nutrients = entry.parsedNutrients
    ? (ParsedNutrientsSchema.safeParse(entry.parsedNutrients).data ?? null)
    : null;
  const confidence = entry.confidence;

  const handleDelete = () => {
    mutate({ id: entry.id, date: entry.date });
    onDelete?.(entry.id);
  };

  return (
    <article
      className={cn(
        'group relative rounded-card border-l-4 bg-warm-50 p-4 shadow-card transition-opacity duration-200 dark:bg-warm-800',
        borderClass,
        isPending && 'pointer-events-none opacity-50',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm text-warm-900 dark:text-warm-100">{entry.description}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-warm-500">
            {isMealType(mealType) && <MealTypeBadge mealType={mealType} />}
            {confidence !== null && confidence !== undefined && (
              <button
                type="button"
                onClick={() => setShowNutrients((v) => !v)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
                aria-expanded={showNutrients}
                aria-label={t('nutrients.confidence.label')}
              >
                <ConfidenceBadge confidence={confidence} />
              </button>
            )}
            <time dateTime={new Date(entry.createdAt).toISOString()}>{time}</time>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={t('foodLog.deleteEntry')}
          className={cn(
            'shrink-0 rounded-full p-1.5 text-warm-400 transition-colors hover:text-red-500',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          )}
        >
          {isPending ? (
            <svg
              className="h-4 w-4 animate-spin"
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
          ) : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
            </svg>
          )}
        </button>
      </div>

      {showNutrients && nutrients !== null && (
        <div className="mt-3">
          <NutrientMiniChart nutrients={nutrients} />
        </div>
      )}
    </article>
  );
}
