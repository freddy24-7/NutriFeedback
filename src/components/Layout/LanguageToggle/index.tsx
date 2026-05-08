import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

type Language = 'en' | 'nl';

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (lang: Language) => {
    if (lang !== language) {
      setLanguage(lang);
      void i18n.changeLanguage(lang);
    }
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('nav.language')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'flex items-center justify-center rounded-md p-1.5 transition-colors',
          'hover:bg-black/5 dark:hover:bg-white/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          open && 'bg-black/5 dark:bg-white/10',
        )}
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {/* Globe icon */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('nav.language')}
          className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {(['en', 'nl'] as Language[]).map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => handleSelect(lang)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                  active ? 'font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/10',
                )}
                style={{
                  color: active ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                }}
              >
                {active && (
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {!active && <span className="w-3.5" aria-hidden="true" />}
                {LANGUAGE_LABELS[lang]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
