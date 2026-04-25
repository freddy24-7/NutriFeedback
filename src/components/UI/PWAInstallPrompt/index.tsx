import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';
import type { PWAInstallPromptProps } from '@/types/components';

const COPY: Record<'en' | 'nl', { body: string; button: string }> = {
  en: {
    body: 'Add NutriApp to your home screen for quick access',
    button: 'Add',
  },
  nl: {
    body: 'Voeg NutriApp toe aan je beginscherm voor snelle toegang',
    button: 'Toevoegen',
  },
};

export function PWAInstallPrompt({ isVisible, onAccept, onDismiss }: PWAInstallPromptProps) {
  const language = useUIStore((s) => s.language);
  const lang = language === 'nl' ? 'nl' : 'en';
  const copy = COPY[lang];

  return (
    <div
      role="dialog"
      aria-label="Install app"
      aria-hidden={!isVisible}
      {...(!isVisible && { inert: '' })}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-warm-200 bg-white p-4 shadow-xl transition-transform duration-300 dark:border-warm-700 dark:bg-warm-900',
        'pb-[max(1rem,env(safe-area-inset-bottom))]',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white"
          aria-hidden="true"
        >
          N
        </div>
        <p className="min-w-0 flex-1 text-sm text-warm-800 dark:text-warm-100">{copy.body}</p>
        <button
          type="button"
          onClick={onAccept}
          className={cn(
            'shrink-0 rounded-pill bg-brand-700 px-4 py-2 text-sm font-medium text-white transition-colors',
            'hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {copy.button}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss install prompt"
          className={cn(
            'shrink-0 rounded-full p-2 text-warm-400 transition-colors hover:bg-warm-100 hover:text-warm-700',
            'dark:hover:bg-warm-800 dark:hover:text-warm-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
