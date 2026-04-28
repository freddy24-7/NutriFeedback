import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useSignIn } from '@clerk/clerk-react';
import { ForgotPasswordFormSchema, type ForgotPasswordFormInput } from '@/types/api';
import { cn } from '@/utils/cn';
import { z } from 'zod';

const ResetSchema = z
  .object({
    code: z.string().min(6, 'Required'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type ResetInput = z.infer<typeof ResetSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [serverError, setServerError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput>({ resolver: zodResolver(ForgotPasswordFormSchema) });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetSubmitting },
    setValue: setResetValue,
  } = useForm<ResetInput>({ resolver: zodResolver(ResetSchema), defaultValues: { code: '' } });

  useEffect(() => {
    if (step === 'reset') {
      const t = setTimeout(() => setResetValue('code', ''), 50);
      return () => clearTimeout(t);
    }
  }, [step, setResetValue]);

  const onRequestReset = async (data: ForgotPasswordFormInput) => {
    if (!isLoaded) return;
    setServerError(null);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: data.email,
      });
      setSubmittedEmail(data.email);
      setStep('reset');
    } catch {
      setServerError(t('auth.error.generic'));
    }
  };

  const onReset = async (data: ResetInput) => {
    if (!isLoaded) return;
    setServerError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: data.code,
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

  if (step === 'reset') {
    return (
      <>
        <Helmet>
          <title>
            {t('auth.forgotPassword.title')} — {t('app.name')}
          </title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>

        <h1
          className="font-display text-xl font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('auth.forgotPassword.success')}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('auth.forgotPassword.successSubtitle', { email: submittedEmail })}
        </p>

        <form
          onSubmit={(e) => void handleResetSubmit(onReset)(e)}
          className="mt-6 space-y-4"
          autoComplete="off"
          noValidate
        >
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('auth.confirm.codeLabel')}
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={cn(
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: resetErrors.code ? 'var(--color-error)' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...registerReset('code')}
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('auth.signUp.passwordLabel')}
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={cn(
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: resetErrors.password ? 'var(--color-error)' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...registerReset('password')}
            />
            {resetErrors.password && (
              <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                {resetErrors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('auth.signUp.confirmPasswordLabel')}
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={cn(
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: resetErrors.confirmPassword
                  ? 'var(--color-error)'
                  : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...registerReset('confirmPassword')}
            />
            {resetErrors.confirmPassword && (
              <p role="alert" className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                {resetErrors.confirmPassword.message}
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
            disabled={isResetSubmitting}
            className={cn(
              'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors duration-150',
              'bg-brand-700 hover:bg-brand-800 disabled:opacity-60',
            )}
          >
            {isResetSubmitting ? t('common.loading') : t('auth.forgotPassword.resetSubmit')}
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {t('auth.forgotPassword.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <h1 className="font-display text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {t('auth.forgotPassword.title')}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {t('auth.forgotPassword.subtitle')}
      </p>

      <form
        onSubmit={(e) => void handleSubmit(onRequestReset)(e)}
        className="mt-6 space-y-4"
        noValidate
      >
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
          disabled={isSubmitting || !isLoaded}
          className={cn(
            'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors duration-150',
            'bg-brand-700 hover:bg-brand-800 disabled:opacity-60',
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
