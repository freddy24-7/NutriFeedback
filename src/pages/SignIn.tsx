import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useSignIn } from '@clerk/clerk-react';
import { SignInFormSchema, type SignInFormInput } from '@/types/api';
import { cn } from '@/utils/cn';

export function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormInput>({ resolver: zodResolver(SignInFormSchema) });

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return;
    setIsGoogleLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch {
      setServerError(t('auth.error.generic'));
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: SignInFormInput) => {
    if (!isLoaded) return;
    setServerError(null);
    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        void navigate('/dashboard');
      } else {
        setServerError(t('auth.error.generic'));
      }
    } catch {
      setServerError(t('auth.error.invalidCredentials'));
    }
  };

  return (
    <>
      <Helmet>
        <title>
          {t('auth.signIn.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
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
          disabled={isSubmitting || !isLoaded}
          className={cn(
            'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors duration-150',
            'bg-brand-700 hover:bg-brand-800 disabled:opacity-60',
          )}
        >
          {isSubmitting ? t('common.loading') : t('auth.signIn.submit')}
        </button>
      </form>

      <div className="relative mt-4 flex items-center gap-3">
        <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('common.or')}
        </span>
        <div className="flex-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={isGoogleLoading || isSubmitting || !isLoaded}
        className={cn(
          'mt-3 flex w-full items-center justify-center gap-3 rounded-pill border py-2.5 text-sm font-medium transition-opacity duration-150',
          'hover:opacity-80 disabled:opacity-50',
        )}
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {isGoogleLoading ? t('common.loading') : t('auth.googleButton')}
      </button>

      <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {t('auth.signIn.noAccount')}{' '}
        <Link to="/signup" className="font-medium" style={{ color: 'var(--color-brand)' }}>
          {t('auth.signIn.signUp')}
        </Link>
      </p>
    </>
  );
}
