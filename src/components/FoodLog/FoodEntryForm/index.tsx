import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { NewFoodEntrySchema, type NewFoodEntryInput, type ProductResponse } from '@/types/api';
import { useAddFoodEntry } from '@/hooks/useFoodLog';
import { useParseFood } from '@/hooks/useParseFood';
import { useProduct } from '@/hooks/useBarcode';
import { useUIStore } from '@/store/uiStore';
import { sanitiseText } from '@/utils/sanitise';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/cn';
import { BarcodeScanner } from '@/components/Barcode/BarcodeScanner';
import { ProductCard } from '@/components/Barcode/ProductCard';
import type { FoodEntryFormProps } from '@/types/components';

type SubmitMode = 'manual' | 'ai';

export function FoodEntryForm({ onSuccess, defaultDate }: FoodEntryFormProps) {
  const { t } = useTranslation();
  const language = useUIStore((s) => s.language);
  const [submitMode, setSubmitMode] = useState<SubmitMode>('manual');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [scanDebug, setScanDebug] = useState<string | null>(null);

  const { mutate: addEntry, isPending: isAdding, error: addError } = useAddFoodEntry();
  const { mutate: parseFood, isPending: isParsing } = useParseFood();
  const {
    data: scannedProduct,
    isLoading: isLookingUp,
    error: lookupError,
  } = useProduct(scannedBarcode);

  const isPending = isAdding || isParsing;

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<NewFoodEntryInput>({
    resolver: zodResolver(NewFoodEntrySchema),
    defaultValues: { date: defaultDate ?? todayISO() },
  });

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    setScannedBarcode(barcode);
    setScanDebug(`Scanned: "${barcode}" (${barcode.length} chars)`);
  };

  const handleProductConfirm = (product: ProductResponse) => {
    const { date, mealType } = getValues();
    const description = [product.name, product.brand].filter(Boolean).join(' — ');
    addEntry(
      { description, mealType, date, productId: product.id },
      {
        onSuccess: () => {
          setScannedBarcode(null);
          reset({ date });
          onSuccess?.();
        },
      },
    );
  };

  const handleProductDismiss = () => {
    setScannedBarcode(null);
  };

  const onSubmit = (data: NewFoodEntryInput) => {
    setAiError(null);
    const clean = sanitiseText(data.description);

    if (submitMode === 'ai') {
      parseFood(
        { description: clean, mealType: data.mealType, date: data.date, language },
        {
          onSuccess: () => {
            reset({ date: data.date });
            onSuccess?.();
          },
          onError: (err) => {
            const msg = err instanceof Error ? err.message : 'parse_failed';
            if (msg === 'insufficient_credits') setAiError(t('ai.parseFood.insufficientCredits'));
            else if (msg === 'rate_limited') setAiError(t('ai.parseFood.rateLimited'));
            else setAiError(t('ai.parseFood.error'));
          },
        },
      );
    } else {
      addEntry(
        { ...data, description: clean },
        {
          onSuccess: () => {
            reset({ date: data.date });
            onSuccess?.();
          },
        },
      );
    }
  };

  const inputClass = cn(
    'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
    'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
  );

  const inputStyle = (hasError: boolean) => ({
    backgroundColor: 'var(--color-surface)',
    borderColor: hasError ? 'var(--color-error)' : 'var(--color-border)',
    color: 'var(--color-text-primary)',
  });

  const errorMessage = aiError ?? (addError !== null ? t('foodLog.error') : null);

  // ── Barcode scan flow ──────────────────────────────────────────────────────
  if (showScanner) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />;
  }

  if (scannedBarcode !== null) {
    return (
      <div className="space-y-3">
        {scanDebug !== null && (
          <p className="break-all rounded bg-warm-100 px-2 py-1 text-xs text-warm-500 dark:bg-warm-700 dark:text-warm-400">
            {scanDebug}
          </p>
        )}
        {isLookingUp && (
          <p
            role="status"
            aria-live="polite"
            className="py-4 text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {t('common.loading')}
          </p>
        )}
        {lookupError !== null && (
          <div className="space-y-2">
            <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
              {lookupError instanceof Error &&
              lookupError.message.toLowerCase().includes('not found')
                ? t('barcode.notFound')
                : t('barcode.lookupError')}
            </p>
            <button
              type="button"
              onClick={handleProductDismiss}
              className="text-sm underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('barcode.dismiss')}
            </button>
          </div>
        )}
        {scannedProduct !== undefined && (
          <ProductCard
            product={scannedProduct}
            onConfirm={handleProductConfirm}
            onDismiss={handleProductDismiss}
          />
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      className="rounded-card p-5 shadow-card dark:shadow-card-dark space-y-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      noValidate
    >
      <h2 className="font-display font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {t('foodLog.addEntry')}
      </h2>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('foodLog.description.label')}
        </label>
        <textarea
          id="description"
          rows={2}
          placeholder={t('foodLog.description.placeholder')}
          aria-invalid={errors.description !== undefined}
          aria-describedby={errors.description ? 'desc-error' : undefined}
          className={cn(inputClass, 'resize-none')}
          style={inputStyle(errors.description !== undefined)}
          {...register('description')}
        />
        {errors.description && (
          <p
            id="desc-error"
            role="alert"
            className="mt-1 text-xs"
            style={{ color: 'var(--color-error)' }}
          >
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Meal type */}
        <div>
          <label
            htmlFor="mealType"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('foodLog.mealType.label')}{' '}
            <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
              ({t('common.optional')})
            </span>
          </label>
          <select
            id="mealType"
            className={inputClass}
            style={inputStyle(false)}
            {...register('mealType')}
          >
            <option value="">{t('foodLog.mealType.placeholder')}</option>
            {(['breakfast', 'lunch', 'dinner', 'snack', 'drink'] as const).map((mt) => (
              <option key={mt} value={mt}>
                {t(`foodLog.mealType.${mt}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('foodLog.date.label')}
          </label>
          <input
            id="date"
            type="date"
            max={todayISO()}
            aria-invalid={errors.date !== undefined}
            aria-describedby={errors.date ? 'date-error' : undefined}
            className={inputClass}
            style={inputStyle(errors.date !== undefined)}
            {...register('date')}
          />
          {errors.date && (
            <p
              id="date-error"
              role="alert"
              className="mt-1 text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.date.message}
            </p>
          )}
        </div>
      </div>

      {errorMessage !== null && (
        <p
          role="alert"
          className="rounded-lg p-3 text-sm"
          style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-error)' }}
        >
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {/* Barcode scan button */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={isPending}
          aria-label={t('barcode.scan')}
          className={cn(
            'rounded-pill px-3 py-2 text-sm font-medium transition-colors duration-150',
            'border border-warm-300 text-warm-600 hover:bg-warm-100 dark:border-warm-600 dark:text-warm-300 dark:hover:bg-warm-800',
            'disabled:opacity-60',
          )}
        >
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
            <path d="M3 5v4M3 5h4M21 5v4M21 5h-4M3 19v-4M3 19h4M21 19v-4M21 19h-4" />
            <rect x="7" y="7" width="10" height="10" rx="1" />
          </svg>
        </button>

        {/* AI parse button — secondary action */}
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            setSubmitMode('ai');
          }}
          className={cn(
            'rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-150',
            'border border-brand-700 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950',
            'disabled:opacity-60',
          )}
        >
          {isParsing ? t('ai.parseFood.loading') : t('ai.parseFood.button')}
        </button>

        {/* Manual save — primary action */}
        <button
          type="submit"
          disabled={isPending}
          onClick={() => {
            setSubmitMode('manual');
          }}
          className={cn(
            'rounded-pill px-6 py-2 font-display font-semibold text-white transition-colors duration-150',
            'bg-brand-700 hover:bg-brand-800 disabled:opacity-60',
          )}
        >
          {isAdding ? t('common.saving') : t('foodLog.submit')}
        </button>
      </div>
    </form>
  );
}
