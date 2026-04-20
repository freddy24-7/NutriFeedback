import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { NutrientMiniChartProps } from '@/types/components';

type Nutrient = 'calories' | 'protein' | 'carbs' | 'fat';

type Row = {
  key: Nutrient;
  value: number;
  unitKey: 'kcal' | 'g';
};

const BAR_COLOUR: Record<Nutrient, string> = {
  calories: 'bg-amber-400',
  protein: 'bg-brand-500',
  carbs: 'bg-brand-300',
  fat: 'bg-warm-400',
};

export function NutrientMiniChart({ nutrients }: NutrientMiniChartProps) {
  const { t } = useTranslation();

  const rows: Row[] = [
    { key: 'calories', value: nutrients.calories ?? NaN, unitKey: 'kcal' },
    { key: 'protein', value: nutrients.protein ?? NaN, unitKey: 'g' },
    { key: 'carbs', value: nutrients.carbs ?? NaN, unitKey: 'g' },
    { key: 'fat', value: nutrients.fat ?? NaN, unitKey: 'g' },
  ].filter((r): r is Row => Number.isFinite(r.value));

  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => r.value));

  const summary = rows
    .map(
      (r) =>
        `${Math.round(r.value)} ${t(`nutrients.unit.${r.unitKey}`)} ${t(`nutrients.${r.key}`)}`,
    )
    .join(', ');

  return (
    <div
      role="img"
      aria-label={summary}
      className="rounded-card border border-warm-200 bg-warm-50 p-3 dark:border-warm-700 dark:bg-warm-800"
    >
      <ul className="space-y-2">
        {rows.map((row) => {
          const pct = max > 0 ? Math.max(2, (row.value / max) * 100) : 0;
          return (
            <li key={row.key} className="flex items-center text-xs">
              <span className="w-16 shrink-0 font-mono text-warm-500">
                {t(`nutrients.${row.key}`)}
              </span>
              <div className="mx-2 h-1.5 flex-1 rounded-full bg-warm-200 dark:bg-warm-700">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    BAR_COLOUR[row.key],
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono tabular-nums text-warm-700 dark:text-warm-200">
                {Math.round(row.value)} {t(`nutrients.unit.${row.unitKey}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
