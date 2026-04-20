import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import type { MealTypeBadgeProps } from '@/types/components';
import type { MealType } from '@/types/api';

const MEAL_TYPE_CLASSES: Record<MealType, string> = {
  breakfast: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  lunch: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  dinner: 'bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-100',
  snack: 'bg-warm-200 text-warm-700 dark:bg-warm-700 dark:text-warm-200',
  drink: 'bg-warm-100 text-warm-700 dark:bg-warm-800 dark:text-warm-200',
};

export function MealTypeBadge({ mealType }: MealTypeBadgeProps) {
  const { t } = useTranslation();
  const label = t(`foodLog.mealType.${mealType}`);

  return (
    <span
      aria-label={label}
      className={cn(
        'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
        MEAL_TYPE_CLASSES[mealType],
      )}
    >
      {label}
    </span>
  );
}
