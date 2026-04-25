import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

type Language = 'en' | 'nl';

const LANGUAGES: readonly Language[] = ['en', 'nl'] as const;

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  const handleSelect = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    void i18n.changeLanguage(lang);
  };

  return (
    <div role="group" aria-label={t('nav.language')} className="inline-flex items-center gap-1">
      {LANGUAGES.map((lang) => {
        const active = language === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleSelect(lang)}
            aria-pressed={active}
            className={cn(
              'rounded-pill border px-2 py-1 font-mono text-xs font-semibold uppercase transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
              active
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-warm-300 bg-transparent text-warm-600 hover:bg-warm-100 dark:border-warm-600 dark:text-warm-300 dark:hover:bg-warm-800',
            )}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
