import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/lib/auth/client';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { LanguageToggle } from '@/components/Layout/LanguageToggle';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    void navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <nav
          className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3"
          aria-label="Main navigation"
        >
          <Link
            to="/"
            className="font-display text-lg font-bold"
            style={{ color: 'var(--color-brand)' }}
          >
            {t('app.name')}
          </Link>

          <div className="flex items-center gap-3">
            {session !== null && session !== undefined ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.dashboard')}
                </Link>
                <button
                  onClick={() => void handleSignOut()}
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/signup"
                  className={cn(
                    'rounded-pill px-4 py-1.5 text-sm font-medium text-white transition-colors duration-150',
                    'bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-300',
                  )}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <LanguageToggle />
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer
        className="mt-16 border-t py-6 text-center text-sm"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        <div className="flex justify-center gap-4">
          <Link to="/terms">{t('nav.terms')}</Link>
          <Link to="/privacy">{t('nav.privacy')}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} NutriApp</p>
      </footer>
    </div>
  );
}
