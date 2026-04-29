import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import diets from '@/data/diets.json';

type Props = {
  selected: string | null;
  onSelect: (dietName: string | null) => void;
  onClose: () => void;
};

export function DietPickerModal({ selected, onSelect, onClose }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your diet"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl dark:bg-warm-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-100 px-5 py-4 dark:border-warm-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              Diet Feedback
            </p>
            <h2 className="mt-0.5 text-base font-bold text-warm-900 dark:text-warm-50">
              Are you on a specific diet?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
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
          </button>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {/* Clear option */}
          {selected !== null && (
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-warm-50 dark:hover:bg-warm-700/50 transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm-100 dark:bg-warm-700">
                <svg
                  className="h-4 w-4 text-warm-400"
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
              </span>
              <span className="text-sm font-medium text-warm-500 dark:text-warm-400">
                Clear diet selection
              </span>
            </button>
          )}

          {diets.map((diet) => {
            const isSelected = selected === diet.name;
            return (
              <button
                key={diet.name}
                type="button"
                onClick={() => {
                  onSelect(diet.name);
                  onClose();
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950'
                    : 'hover:bg-warm-50 dark:hover:bg-warm-700/50',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-warm-100 text-warm-500 dark:bg-warm-700 dark:text-warm-300',
                  )}
                >
                  {isSelected ? (
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    diet.name.charAt(0)
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium truncate',
                      isSelected
                        ? 'text-brand-700 dark:text-brand-400'
                        : 'text-warm-800 dark:text-warm-100',
                    )}
                  >
                    {diet.name}
                  </p>
                  <p className="text-xs text-warm-400 truncate">{diet.category}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
