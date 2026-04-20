import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';
import { ForgotPasswordFormSchema, type ForgotPasswordFormInput } from '@/types/api';
import { cn } from '@/utils/cn';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput>({ resolver: zodResolver(ForgotPasswordFormSchema) });

  const onSubmit = async (data: ForgotPasswordFormInput) => {
    setServerError(null);
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    if (error) {
      setServerError(t('auth.error.generic'));
      return;
    }
    setSubmitted(data.email);
  };

  if (submitted !== null) {
    return (
      <div className="text-center">
        <h1
          className="font-display text-xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('auth.forgotPassword.success')}
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('auth.forgotPassword.successSubtitle', { email: submitted })}
        </p>
        <Link
          to="/signin"
          className="mt-6 block text-sm font-medium"
          style={{ color: 'var(--color-brand)' }}
        >
          {t('auth.forgotPassword.back')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {t('auth.forgotPassword.title')} — {t('app.name')}
        </title>
      </Helmet>

      <h1 className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.forgotPassword.title')}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('auth.forgotPassword.subtitle')}
      </p>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('auth.forgotPassword.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(
              'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            )}
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: errors.email ? 'var(--color-error)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            {...register('email')}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-1 text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.email.message}
            </p>
          )}
        </div>

        {serverError !== null && (
          <p
            role="alert"
            className="rounded-lg p-3 text-sm"
            style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-error)' }}
          >
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors duration-150',
            'bg-brand-500 hover:bg-brand-600 disabled:opacity-60',
          )}
        >
          {isSubmitting ? t('common.loading') : t('auth.forgotPassword.submit')}
        </button>
      </form>

      <Link
        to="/signin"
        className="mt-4 block text-center text-sm"
        style={{ color: 'var(--color-brand)' }}
      >
        {t('auth.forgotPassword.back')}
      </Link>
    </>
  );
}
