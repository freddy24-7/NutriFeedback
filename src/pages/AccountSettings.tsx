import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useClerk } from '@clerk/clerk-react';
import { useExportData, useDeleteAccount } from '@/hooks/useAccount';
import { cn } from '@/utils/cn';

export function AccountSettingsPage() {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const { mutate: exportData, isPending: isExporting, isSuccess: exported } = useExportData();
  const { mutate: deleteAccount, isPending: isDeleting, error: deleteError } = useDeleteAccount();

  const handleDelete = () => {
    deleteAccount(undefined, {
      onSuccess: () => {
        void signOut({ redirectUrl: '/' });
      },
    });
  };

  return (
    <>
      <Helmet>
        <title>
          {t('account.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-xl space-y-10">
        <div>
          <h1
            className="font-display text-display-md font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('account.title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('account.subtitle')}
          </p>
        </div>

        {/* Export */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {t('account.export.title')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('account.export.description')}
          </p>
          <button
            type="button"
            onClick={() => exportData()}
            disabled={isExporting}
            className={cn(
              'rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-150',
              'border-brand-700 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950',
              'disabled:opacity-60',
            )}
          >
            {isExporting ? t('account.export.downloading') : t('account.export.button')}
          </button>
          {exported && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t('account.export.success')}
            </p>
          )}
        </section>

        {/* Delete account */}
        <section
          className="space-y-4 rounded-card border-2 border-red-500 p-5"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Danger zone header */}
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">
              {t('account.delete.dangerZone')}
            </span>
          </div>

          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-error)' }}>
              {t('account.delete.title')}
            </h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {t('account.delete.description')}
            </p>
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-pill border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              {t('account.delete.button')}
            </button>
          ) : (
            <div className="space-y-3">
              {/* Warning box */}
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
                <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                  {t('account.delete.areYouSure')}
                </p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-red-600 dark:text-red-400">
                  <li>{t('account.delete.warningFoodLog')}</li>
                  <li>{t('account.delete.warningTips')}</li>
                  <li>{t('account.delete.warningNoUndo')}</li>
                </ul>
              </div>

              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {t('account.delete.confirmPrompt')}
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder={t('account.delete.confirmPlaceholder')}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-red-500"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteInput !== 'DELETE' || isDeleting}
                  className="rounded-pill bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? t('account.delete.deleting') : t('account.delete.confirmButton')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteInput('');
                  }}
                  className="rounded-pill border px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
              {deleteError && (
                <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                  {t('common.error')}
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
