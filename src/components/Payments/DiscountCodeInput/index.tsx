import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { DiscountValidateSchema, type DiscountValidateInput } from '@/types/api';
import { useApplyDiscount } from '@/hooks/useSubscription';
import { cn } from '@/utils/cn';
import type { DiscountCodeInputProps } from '@/types/components';

export function DiscountCodeInput({ onSuccess }: DiscountCodeInputProps) {
  const { t } = useTranslation();
  const { mutate, isPending, error, isSuccess, data } = useApplyDiscount();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DiscountValidateInput>({
    resolver: zodResolver(DiscountValidateSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (isSuccess && data && onSuccess) {
      onSuccess(data);
    }
  }, [isSuccess, data, onSuccess]);

  const onSubmit = (values: DiscountValidateInput) => {
    mutate({ code: values.code.toUpperCase() });
  };

  const inlineError = errors.code?.message ?? (error instanceof Error ? error.message : null);

  const { onChange: registerOnChange, ...codeRegister } = register('code');

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-2" noValidate>
      <div className="flex items-stretch gap-2">
        <input
          {...codeRegister}
          onChange={(e) => {
            const upper = e.target.value.toUpperCase();
            setValue('code', upper, { shouldValidate: false });
            void registerOnChange({
              ...e,
              target: { ...e.target, value: upper },
            });
          }}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={isPending || isSuccess}
          aria-label={t('subscription.discount.placeholder')}
          aria-invalid={inlineError !== null}
          placeholder={t('subscription.discount.placeholder')}
          className={cn(
            'flex-1 rounded-input border border-warm-300 bg-white px-3 py-2 font-mono text-sm uppercase tracking-wide outline-none transition-colors',
            'placeholder:normal-case placeholder:tracking-normal placeholder:text-warm-400',
            'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            'dark:border-warm-600 dark:bg-warm-900 dark:text-warm-100',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        />
        <button
          type="submit"
          disabled={isPending || isSuccess}
          className={cn(
            'shrink-0 rounded-pill bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
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
            t('subscription.discount.apply')
          )}
        </button>
      </div>

      {isSuccess && (
        <p
          role="status"
          className="flex items-center gap-1 text-sm text-brand-700 dark:text-brand-400"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t('subscription.discount.applied')}
        </p>
      )}

      {!isSuccess && inlineError !== null && (
        <p role="alert" className="text-sm text-red-500">
          {inlineError}
        </p>
      )}
    </form>
  );
}
