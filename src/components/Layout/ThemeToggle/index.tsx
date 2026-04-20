import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const isDark = theme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={t('nav.toggleTheme')}
      aria-pressed={isDark}
      className={cn(
        'relative rounded-full bg-warm-100 p-2 transition-all duration-300 dark:bg-warm-700',
        'hover:bg-warm-200 dark:hover:bg-warm-600',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
      )}
    >
      <span className="relative block h-5 w-5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-5 w-5 text-warm-700 transition-all duration-300 dark:text-warm-200',
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M4.93 19.07l1.41-1.41" />
          <path d="M17.66 6.34l1.41-1.41" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-5 w-5 text-warm-700 transition-all duration-300 dark:text-warm-200',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
          )}
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </span>
    </button>
  );
}
