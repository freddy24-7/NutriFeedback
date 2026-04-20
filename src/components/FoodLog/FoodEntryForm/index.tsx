import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { NewFoodEntrySchema, type NewFoodEntryInput } from '@/types/api';
import { useAddFoodEntry } from '@/hooks/useFoodLog';
import { sanitiseText } from '@/utils/sanitise';
import { todayISO } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { FoodEntryFormProps } from '@/types/components';

export function FoodEntryForm({ onSuccess, defaultDate }: FoodEntryFormProps) {
  const { t } = useTranslation();
  const { mutate, isPending, error } = useAddFoodEntry();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewFoodEntryInput>({
    resolver: zodResolver(NewFoodEntrySchema),
    defaultValues: { date: defaultDate ?? todayISO() },
  });

  const onSubmit = (data: NewFoodEntryInput) => {
    mutate(
      { ...data, description: sanitiseText(data.description) },
      {
        onSuccess: () => {
          reset({ date: data.date });
          onSuccess?.();
        },
      },
    );
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

      {error !== null && (
        <p
          role="alert"
          className="rounded-lg p-3 text-sm"
          style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-error)' }}
        >
          {t('foodLog.error')}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'rounded-pill px-6 py-2 font-display font-semibold text-white transition-colors duration-150',
            'bg-brand-500 hover:bg-brand-600 disabled:opacity-60',
          )}
        >
          {isPending ? t('common.saving') : t('foodLog.submit')}
        </button>
      </div>
    </form>
  );
}
