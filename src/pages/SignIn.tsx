import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';
import { SignInFormSchema, type SignInFormInput } from '@/types/api';
import { cn } from '@/utils/cn';

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormInput>({ resolver: zodResolver(SignInFormSchema) });

  const onSubmit = async (data: SignInFormInput) => {
    setServerError(null);
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(t('auth.error.invalidCredentials'));
      return;
    }

    void navigate('/dashboard');
  };

  return (
    <>
      <Helmet>
        <title>
          {t('auth.signIn.title')} — {t('app.name')}
        </title>
      </Helmet>

      <h1 className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.signIn.title')}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('auth.signIn.subtitle')}
      </p>

      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('auth.signIn.emailLabel')}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.signIn.emailPlaceholder')}
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
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('auth.signIn.passwordLabel')}
            </label>
            <Link to="/forgot-password" className="text-xs" style={{ color: 'var(--color-brand)' }}>
              {t('auth.signIn.forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
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
          {isSubmitting ? t('common.loading') : t('auth.signIn.submit')}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.signIn.noAccount')}{' '}
        <Link to="/signup" className="font-medium" style={{ color: 'var(--color-brand)' }}>
          {t('auth.signIn.signUp')}
        </Link>
      </p>
    </>
  );
}
