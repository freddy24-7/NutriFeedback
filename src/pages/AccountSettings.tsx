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
          className="space-y-3 rounded-card border p-5"
          style={{ borderColor: 'var(--color-error)', backgroundColor: 'var(--color-surface)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--color-error)' }}>
            {t('account.delete.title')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('account.delete.description')}
          </p>

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
