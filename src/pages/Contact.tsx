import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ContactFormSchema, type ContactFormInput } from '@/types/api';
import { useContact } from '@/hooks/useContact';
import { sanitiseText } from '@/utils/sanitise';
import { cn } from '@/utils/cn';

export function ContactPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const { mutate, isPending, error } = useContact();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormInput>({ resolver: zodResolver(ContactFormSchema) });

  const onSubmit = (data: ContactFormInput) => {
    mutate(
      { ...data, name: sanitiseText(data.name), message: sanitiseText(data.message) },
      { onSuccess: () => setSent(true) },
    );
  };

  if (sent) {
    return (
      <div className="py-16 text-center">
        <h1
          className="font-display text-display-md font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('contact.success')}
        </h1>
        <p className="mt-3" style={{ color: 'var(--color-text-secondary)' }}>
          {t('contact.successSubtitle')}
        </p>
      </div>
    );
  }

  const errorMessage =
    error !== null
      ? error.message.includes('429')
        ? t('contact.rateLimited')
        : t('contact.error')
      : null;

  return (
    <>
      <Helmet>
        <title>
          {t('contact.title')} — {t('app.name')}
        </title>
      </Helmet>

      <div className="mx-auto max-w-xl">
        <h1
          className="font-display text-display-md font-bold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {t('contact.title')}
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          {t('contact.subtitle')}
        </p>

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="mt-8 space-y-5"
          noValidate
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('contact.name.label')}
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder={t('contact.name.placeholder')}
              aria-invalid={errors.name !== undefined}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={cn(
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: errors.name ? 'var(--color-error)' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...register('name')}
            />
            {errors.name && (
              <p
                id="name-error"
                role="alert"
                className="mt-1 text-xs"
                style={{ color: 'var(--color-error)' }}
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('contact.email.label')}
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              placeholder={t('contact.email.placeholder')}
              aria-invalid={errors.email !== undefined}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
              className={cn(
                'mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: errors.email ? 'var(--color-error)' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="contact-email-error"
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
              htmlFor="message"
              className="block text-sm font-medium"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('contact.message.label')}
            </label>
            <textarea
              id="message"
              rows={5}
              placeholder={t('contact.message.placeholder')}
              aria-invalid={errors.message !== undefined}
              aria-describedby={errors.message ? 'message-error' : undefined}
              className={cn(
                'mt-1 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
                'focus:border-brand-500 focus:ring-1 focus:ring-brand-500',
              )}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: errors.message ? 'var(--color-error)' : 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
              {...register('message')}
            />
            {errors.message && (
              <p
                id="message-error"
                role="alert"
                className="mt-1 text-xs"
                style={{ color: 'var(--color-error)' }}
              >
                {errors.message.message}
              </p>
            )}
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

          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'w-full rounded-pill py-2.5 font-display font-semibold text-white transition-colors duration-150',
              'bg-brand-500 hover:bg-brand-600 disabled:opacity-60',
            )}
          >
            {isPending ? t('contact.submitting') : t('contact.submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {t('contact.responseTime')}
        </p>
      </div>
    </>
  );
}
