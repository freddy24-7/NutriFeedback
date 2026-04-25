import { useTranslation } from 'react-i18next';
import { NutrientMiniChart } from '@/components/AI/NutrientMiniChart';
import { cn } from '@/utils/cn';
import type { ProductCardProps } from '@/types/components';
import type { ParsedNutrients, ProductResponse } from '@/types/api';

type Source = ProductResponse['source'];

const SOURCE_BADGE: Record<Source, string> = {
  open_food_facts: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  usda: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ai_estimated: 'bg-warm-200 text-warm-600 dark:bg-warm-700 dark:text-warm-300',
  user: 'bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-100',
};

type SquareColour = 'green' | 'amber' | 'red' | 'grey';

const SQUARE_CLASS: Record<SquareColour, string> = {
  green: 'bg-brand-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  grey: 'bg-warm-300 dark:bg-warm-600',
};

function squaresForLevel(level: 1 | 2 | 3 | 4): SquareColour[] {
  switch (level) {
    case 1:
      return ['green', 'green', 'green', 'green'];
    case 2:
      return ['green', 'green', 'grey', 'grey'];
    case 3:
      return ['amber', 'amber', 'amber', 'grey'];
    case 4:
      return ['red', 'red', 'red', 'red'];
  }
}

function isProcessingLevel(value: number | null): value is 1 | 2 | 3 | 4 {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function toParsedNutrients(product: ProductResponse): ParsedNutrients {
  const n = product.nutritionalPer100g;
  return {
    calories: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: n.fiber,
    sugar: n.sugar,
    sodium: n.sodium,
    servingDescription: null,
    confidence: product.confidence ?? 1,
  };
}

function hasAnyNutrient(n: ParsedNutrients): boolean {
  return n.calories !== null || n.protein !== null || n.carbs !== null || n.fat !== null;
}

export function ProductCard({ product, onConfirm, onDismiss }: ProductCardProps) {
  const { t } = useTranslation();
  const sourceLabel = t(`barcode.source.${product.source}`);
  const nutrients = toParsedNutrients(product);
  const showChart = hasAnyNutrient(nutrients);

  return (
    <article className="rounded-card bg-warm-50 p-4 shadow-card dark:bg-warm-800">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-sans font-semibold text-warm-900 dark:text-warm-100">
            {product.name}
          </h3>
          {product.brand !== null && product.brand.length > 0 && (
            <p className="mt-0.5 truncate text-sm text-warm-500">{product.brand}</p>
          )}
        </div>
        <span
          aria-label={sourceLabel}
          className={cn(
            'shrink-0 rounded-pill px-2 py-0.5 text-xs font-medium',
            SOURCE_BADGE[product.source],
          )}
        >
          {sourceLabel}
        </span>
      </header>

      {isProcessingLevel(product.processingLevel) && (
        <div className="mt-3">
          <p className="text-xs font-medium text-warm-500">{t('barcode.processingLevel')}</p>
          <div
            aria-label={`${t('barcode.processingLevel')}: ${product.processingLevel}`}
            className="mt-1 flex items-center gap-1"
          >
            {squaresForLevel(product.processingLevel).map((colour, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn('h-3 w-3 rounded-sm', SQUARE_CLASS[colour])}
              />
            ))}
          </div>
        </div>
      )}

      {showChart && (
        <div className="mt-4">
          <NutrientMiniChart nutrients={nutrients} />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'text-sm text-warm-400 underline transition-colors hover:text-warm-700 dark:hover:text-warm-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {t('barcode.dismiss')}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(product)}
          aria-label={t('barcode.confirmAdd')}
          className={cn(
            'rounded-pill bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
          )}
        >
          {t('barcode.confirmAdd')}
        </button>
      </div>
    </article>
  );
}
