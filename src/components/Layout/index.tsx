import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ThemeToggle } from '@/components/Layout/ThemeToggle';
import { LanguageToggle } from '@/components/Layout/LanguageToggle';
import { DietsDropdown } from '@/components/Layout/DietsDropdown';
import { CreditCounter } from '@/components/Payments/CreditCounter';
import { ChatbotDrawer } from '@/components/Chatbot/ChatbotDrawer';
import { HowToUseModal } from '@/components/HowToUse/HowToUseModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { data: sub } = useSubscription();
  const language = useUIStore((s) => s.language);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const handleSignOut = async () => {
    await signOut();
    void navigate('/');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void updateServiceWorker(true);
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
          {/* ── Logo ── */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label={t('nav.home')}
              className="rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 11h1v6a1 1 0 001 1h4v-4h2v4h4a1 1 0 001-1v-6h1a1 1 0 00.707-1.707l-7-7z" />
              </svg>
            </Link>
            <Link
              to="/"
              className="font-display text-lg font-bold"
              style={{ color: 'var(--color-brand)' }}
            >
              {t('app.name')}
            </Link>
          </div>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-3">
            <DietsDropdown />
            {isSignedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/pricing"
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.pricing')}
                </Link>
                {sub !== undefined && (
                  <CreditCounter
                    creditsRemaining={sub.creditsRemaining}
                    creditsExpiresAt={sub.creditsExpiresAt}
                  />
                )}
                <Link
                  to="/account"
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.account')}
                </Link>
                <button
                  type="button"
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
                    'bg-brand-700 hover:bg-brand-800 dark:bg-brand-400 dark:hover:bg-brand-300',
                  )}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            <LanguageToggle />
            <ThemeToggle />
            <RefreshButton
              needRefresh={needRefresh}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          </div>

          {/* ── Mobile right side ── */}
          <div className="flex md:hidden items-center gap-2">
            <RefreshButton
              needRefresh={needRefresh}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              className="rounded-md p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </nav>

        {/* ── Mobile dropdown ── */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden border-t px-4 py-3 flex flex-col gap-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
          >
            <DietsDropdown />
            {isSignedIn ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium py-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium py-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.pricing')}
                </Link>
                {sub !== undefined && (
                  <CreditCounter
                    creditsRemaining={sub.creditsRemaining}
                    creditsExpiresAt={sub.creditsExpiresAt}
                  />
                )}
                <Link
                  to="/account"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium py-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.account')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    void handleSignOut();
                  }}
                  className="text-left text-sm font-medium py-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-medium py-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'rounded-pill px-4 py-1.5 text-sm font-medium text-white text-center transition-colors duration-150',
                    'bg-brand-700 hover:bg-brand-800 dark:bg-brand-400 dark:hover:bg-brand-300',
                  )}
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
            <div className="flex items-center gap-2 pt-1">
              <LanguageToggle />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <footer
        className="mt-16 border-t py-6 text-center text-sm"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/terms">{t('nav.terms')}</Link>
          <Link to="/privacy">{t('nav.privacy')}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
          {isSignedIn && (
            <button
              type="button"
              onClick={() => setIsHowToOpen(true)}
              className="underline-offset-2 hover:underline"
            >
              {t('howToUse.open')}
            </button>
          )}
        </div>
        <p className="mt-2">© {new Date().getFullYear()} NutriApp</p>
      </footer>

      {isSignedIn && (
        <>
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            aria-label={t('chatbot.open')}
            className={cn(
              'fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition-all',
              'hover:bg-brand-800 hover:shadow-xl',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
            )}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          <ChatbotDrawer
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            language={language}
          />

          <HowToUseModal isOpen={isHowToOpen} onClose={() => setIsHowToOpen(false)} />
        </>
      )}
    </div>
  );
}

function RefreshButton({
  needRefresh,
  isRefreshing,
  onRefresh,
}: {
  needRefresh: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      title={needRefresh ? 'Update available' : 'App up to date'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
        needRefresh
          ? 'bg-brand-500 text-white hover:bg-brand-600'
          : 'bg-warm-100 text-warm-500 hover:bg-warm-200 dark:bg-warm-700 dark:text-warm-300 dark:hover:bg-warm-600',
        isRefreshing && 'opacity-70 cursor-not-allowed',
      )}
    >
      {isRefreshing ? (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-75"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      )}
      {needRefresh ? 'Update' : 'Up to date'}
    </button>
  );
}
