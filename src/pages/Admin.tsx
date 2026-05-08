import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAdminUsers, useAdjustCredits, type AdminUser } from '@/hooks/useAdmin';
import { cn } from '@/utils/cn';

const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID as string | undefined;

const STATUS_STYLES: Record<AdminUser['subscriptionStatus'], string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  comped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  trial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-warm-100 text-warm-600 dark:bg-warm-800/40 dark:text-warm-400',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function CreditAdjuster({ user }: { user: AdminUser }) {
  const [delta, setDelta] = useState('');
  const { mutate, isPending, error } = useAdjustCredits();

  const isPaid = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'comped';

  if (isPaid) {
    return (
      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        —
      </span>
    );
  }

  const submit = () => {
    const n = parseInt(delta, 10);
    if (isNaN(n) || n === 0) return;
    mutate({ userId: user.id, amount: n }, { onSuccess: () => setDelta('') });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {user.creditsRemaining}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          / {user.creditsUsed} used
        </span>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="±"
          className="w-16 rounded border px-1.5 py-0.5 text-xs outline-none focus:border-brand-500 tabular-nums"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={submit}
          disabled={isPending || !delta || delta === '0'}
          className="rounded px-2 py-0.5 text-xs font-medium bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {isPending ? '…' : 'Apply'}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }}>
          {error.message}
        </p>
      )}
    </div>
  );
}

export function AdminPage() {
  const { userId, isLoaded } = useAuth();
  const { data: users, isLoading, error, refetch } = useAdminUsers();
  const [search, setSearch] = useState('');

  if (!isLoaded) return null;

  if (userId !== ADMIN_USER_ID) {
    return <Navigate to="/" replace />;
  }

  const filtered = (users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const totalUsers = users?.length ?? 0;
  const paidUsers =
    users?.filter((u) => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'comped')
      .length ?? 0;
  const totalApiCalls = users?.reduce((s, u) => s + u.apiCalls, 0) ?? 0;

  return (
    <>
      <Helmet>
        <title>Admin — NutriApp</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="font-display text-display-md font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Admin
          </h1>
          <button
            onClick={() => void refetch()}
            className="rounded-pill border px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Refresh
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total users', value: totalUsers },
            { label: 'Paid / comped', value: paidUsers },
            { label: 'Total API calls', value: totalApiCalls },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border p-4"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface)',
              }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {value}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, or user ID…"
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-500"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />

        {/* Table */}
        {isLoading && (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Loading…
          </p>
        )}
        {error && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            {error.message}
          </p>
        )}

        {!isLoading && !error && (
          <div
            className="overflow-x-auto rounded-xl border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <table
              className="min-w-full divide-y text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface)' }}>
                  {[
                    'User',
                    'Signed up',
                    'Last login',
                    'Status',
                    'Food logs',
                    'API calls',
                    'Credits',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      No users found.
                    </td>
                  </tr>
                )}
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ backgroundColor: 'var(--color-background)' }}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {user.name ?? (
                          <span style={{ color: 'var(--color-text-secondary)' }}>No name</span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {user.email ?? user.id}
                      </p>
                    </td>

                    {/* Signed up */}
                    <td
                      className="px-4 py-3 tabular-nums"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmt(user.signedUpAt)}
                    </td>

                    {/* Last login */}
                    <td
                      className="px-4 py-3 tabular-nums"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {fmt(user.lastSignInAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_STYLES[user.subscriptionStatus],
                        )}
                      >
                        {user.subscriptionStatus}
                      </span>
                    </td>

                    {/* Food log entries */}
                    <td
                      className="px-4 py-3 tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {user.foodLogEntries}
                    </td>

                    {/* API calls */}
                    <td
                      className="px-4 py-3 tabular-nums"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {user.apiCalls}
                    </td>

                    {/* Credits */}
                    <td className="px-4 py-3">
                      <CreditAdjuster user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
