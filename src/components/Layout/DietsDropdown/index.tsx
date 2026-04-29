import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import diets from '@/data/diets.json';

type Diet = (typeof diets)[number];

const EVIDENCE_COLOR: Record<string, string> = {
  High: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  Low: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

function evidenceColor(level: string): string {
  if (level.startsWith('High')) return EVIDENCE_COLOR['High'] ?? '';
  if (level.startsWith('Moderate')) return EVIDENCE_COLOR['Moderate'] ?? '';
  return EVIDENCE_COLOR['Low'] ?? '';
}

function DietAccordionItem({ diet }: { diet: Diet }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-warm-100 dark:border-warm-700 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-warm-50 dark:hover:bg-warm-700/50 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-warm-800 dark:text-warm-100 truncate">
            {diet.name}
          </p>
          <p className="text-xs text-warm-400 truncate">{diet.category}</p>
        </div>
        <svg
          className={cn(
            'h-4 w-4 shrink-0 text-warm-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs leading-relaxed text-warm-600 dark:text-warm-300">
            {diet.description}
          </p>

          {/* Evidence level */}
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              evidenceColor(diet.evidence_level),
            )}
          >
            Evidence: {diet.evidence_level}
          </span>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {(
              [
                {
                  label: 'Carbs',
                  value: diet.macronutrient_split.carbs,
                  color: 'bg-amber-100 dark:bg-amber-900/40',
                },
                {
                  label: 'Fat',
                  value: diet.macronutrient_split.fat,
                  color: 'bg-purple-100 dark:bg-purple-900/40',
                },
                {
                  label: 'Protein',
                  value: diet.macronutrient_split.protein,
                  color: 'bg-red-100 dark:bg-red-900/40',
                },
              ] as const
            ).map((m) => (
              <div key={m.label} className={cn('rounded-lg p-1.5', m.color)}>
                <p className="text-[10px] font-medium text-warm-500 dark:text-warm-400">
                  {m.label}
                </p>
                <p className="text-xs font-bold text-warm-800 dark:text-warm-100">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Pros / Cons */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                Pros
              </p>
              <ul className="space-y-0.5">
                {diet.pros.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-1 text-xs text-warm-600 dark:text-warm-300"
                  >
                    <span className="mt-0.5 text-green-500">✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-500 dark:text-red-400">
                Cons
              </p>
              <ul className="space-y-0.5">
                {diet.cons.map((c) => (
                  <li
                    key={c}
                    className="flex items-start gap-1 text-xs text-warm-600 dark:text-warm-300"
                  >
                    <span className="mt-0.5 text-red-400">✕</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DietsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 text-sm font-medium transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Diets
        <svg
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-warm-200 bg-white shadow-xl dark:border-warm-700 dark:bg-warm-800"
          role="region"
          aria-label="Diet guides"
        >
          <div className="border-b border-warm-100 px-4 py-2.5 dark:border-warm-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-warm-500 dark:text-warm-400">
              Diet Guides
            </p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {diets.map((diet) => (
              <DietAccordionItem key={diet.name} diet={diet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
