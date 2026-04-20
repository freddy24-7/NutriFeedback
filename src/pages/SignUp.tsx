import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';
import { SignUpFormSchema, type SignUpFormInput } from '@/types/api';
import { cn } from '@/utils/cn';

export function SignUpPage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormInput>({ resolver: zodResolver(SignUpFormSchema) });

  const onSubmit = async (data: SignUpFormInput) => {
    setServerError(null);
    const { error } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.email.split('@')[0] ?? data.email,
    });

    if (error) {
      setServerError(error.status === 422 ? t('auth.error.emailTaken') : t('auth.error.generic'));
      return;
    }

    setEmailSent(data.email);
  };

  if (emailSent !== null) {
    return (
      <div className="text-center">
        <h1
          className="font-display text-xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('auth.signUp.confirmEmailTitle')}
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('auth.signUp.confirmEmailMessage', { email: emailSent })}
        </p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {t('auth.signUp.title')} — {t('app.name')}
        </title>
      </Helmet>

      <h1 className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.signUp.title')}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('auth.signUp.subtitle')}
      </p>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('auth.signUp.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.signUp.emailPlaceholder')}
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

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('auth.signUp.passwordLabel')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.signUp.passwordPlaceholder')}
            aria-invalid={errors.password !== undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={cn(
              'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            )}
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: errors.password ? 'var(--color-error)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            {...register('password')}
          />
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="mt-1 text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('auth.signUp.confirmPasswordLabel')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword !== undefined}
            aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
            className={cn(
              'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
            )}
            style={{
              backgroundColor: 'var(--color-bg)',
              borderColor: errors.confirmPassword ? 'var(--color-error)' : 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p
              id="confirm-error"
              role="alert"
              className="mt-1 text-xs"
              style={{ color: 'var(--color-error)' }}
            >
              {errors.confirmPassword.message}
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
          {isSubmitting ? t('common.saving') : t('auth.signUp.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.signUp.alreadyHaveAccount')}{' '}
        <Link to="/signin" className="font-medium" style={{ color: 'var(--color-brand)' }}>
          {t('auth.signUp.signIn')}
        </Link>
      </p>

      <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.signUp.terms')}{' '}
        <Link to="/terms" className="underline">
          {t('auth.signUp.termsLink')}
        </Link>{' '}
        {t('auth.signUp.and')}{' '}
        <Link to="/privacy" className="underline">
          {t('auth.signUp.privacyLink')}
        </Link>
        .
      </p>
    </>
  );
}
