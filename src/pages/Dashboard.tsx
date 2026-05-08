import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useUIStore } from '@/store/uiStore';
import { todayISO, formatDate } from '@/utils/date';
import { DailyView } from '@/components/FoodLog/DailyView';
import { FoodEntryForm } from '@/components/FoodLog/FoodEntryForm';
import { AiTipCard } from '@/components/AI/AiTipCard';
import { PaywallModal } from '@/components/Payments/PaywallModal';
import { OnboardingTooltip } from '@/components/UI/OnboardingTooltip';
import { DietPickerModal } from '@/components/AI/DietPickerModal';
import {
  useAiTips,
  useDismissTip,
  useGenerateTip,
  useGenerateDietFeedback,
} from '@/hooks/useAiTips';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/utils/cn';
import diets from '@/data/diets.json';

const ONBOARDING_DONE_KEY = 'nutriapp_hasCompletedOnboarding';

function readOnboardingInitialStep(): 1 | 2 | 3 | 4 | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true' ? null : 1;
  } catch {
    return null;
  }
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const { session } = useClerk();
  const language = useUIStore((s) => s.language);
  const selectedDiet = useUIStore((s) => s.selectedDiet);
  const setSelectedDiet = useUIStore((s) => s.setSelectedDiet);

  // Lazy provisioning: if on-signup failed (e.g. token timing), ensure rows exist
  useEffect(() => {
    if (!isSignedIn || !isLoaded) return;
    void (async () => {
      const token = await session?.getToken();
      if (!token) return;
      await fetch('/api/auth/on-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    })();
  }, [isSignedIn, isLoaded, session]);
  const [date, setDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [showDietPicker, setShowDietPicker] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const { data: sub } = useSubscription();
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4 | null>(
    readOnboardingInitialStep,
  );

  const paywallReason = sub?.status === 'expired' ? 'expired' : 'no_credits';

  // Auto-open when credits exhausted or trial expired, unless user has dismissed it this session
  const shouldShowPaywall =
    !paywallDismissed &&
    sub !== undefined &&
    (sub.status === 'expired' || (sub.status === 'trial' && sub.creditsRemaining === 0));

  const { data: tips, error: tipsQueryError, isError: tipsQueryFailed } = useAiTips();
  const { mutate: dismissTip } = useDismissTip();
  const { mutate: generateTip, isPending: isGenerating, error: tipError } = useGenerateTip();
  const {
    mutate: generateDietFeedback,
    isPending: isDietFeedbackGenerating,
    error: dietFeedbackError,
  } = useGenerateDietFeedback();

  const handleDismiss = (id: string) => {
    setDismissingId(id);
    dismissTip(id, { onSettled: () => setDismissingId(null) });
  };

  const handleDietFeedback = () => {
    const diet = diets.find((d) => d.name === selectedDiet);
    if (!diet) return;
    generateDietFeedback({
      dietName: diet.name,
      dietDescription: diet.description,
      dietCarbs: diet.macronutrient_split.carbs,
      dietFat: diet.macronutrient_split.fat,
      dietProtein: diet.macronutrient_split.protein,
      dietPros: diet.pros,
      dietCons: diet.cons,
    });
  };

  const mapTipFlowError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'insufficient_credits') return t('ai.tip.insufficientCredits');
    if (
      msg === 'not_enough_data' ||
      msg === 'Need at least 3 days of food log data to generate tips' ||
      (msg.includes('at least 3 days') && msg.includes('food log'))
    ) {
      return t('ai.tip.notEnoughData');
    }
    if (msg === 'rate_limited') return t('ai.tip.rateLimited');
    return t('common.error');
  };

  const tipErrorMessage = tipError ? mapTipFlowError(tipError) : null;
  const dietFeedbackErrorMessage = dietFeedbackError ? mapTipFlowError(dietFeedbackError) : null;
  const tipsLoadErrorMessage = tipsQueryFailed ? mapTipFlowError(tipsQueryError) : null;

  const displayDate = formatDate(date, i18n.language);

  const completeOnboarding = () => {
    setOnboardingStep(null);
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
    } catch {
      /* ignore quota / private mode */
    }
  };

  const goToNextOnboardingStep = () => {
    setOnboardingStep((s) => {
      if (s === 1) return 2;
      if (s === 2) return 3;
      if (s === 3) return 4;
      return s;
    });
  };

  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <PaywallModal
        isOpen={shouldShowPaywall}
        onClose={() => setPaywallDismissed(true)}
        reason={paywallReason}
      />

      <Helmet>
        <title>
          {t('dashboard.title')} — {t('app.name')}
        </title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="space-y-6">
        <div className="relative flex items-center justify-between">
          <div>
            <h1
              className="font-display text-display-md font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('dashboard.todayLog')}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {displayDate}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() - 1);
                  setDate(d.toISOString().slice(0, 10));
                }}
                aria-label="Previous day"
                className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
                max={todayISO()}
                aria-label={t('dashboard.viewDate')}
                className="rounded-lg border px-2 py-1 text-sm outline-none focus:border-brand-500"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const d = new Date(date);
                  d.setDate(d.getDate() + 1);
                  setDate(d.toISOString().slice(0, 10));
                }}
                disabled={date >= todayISO()}
                aria-label="Next day"
                className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-default"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded-pill bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
            >
              {showForm ? t('common.cancel') : t('dashboard.addEntry')}
            </button>
          </div>

          {onboardingStep !== null && (
            <OnboardingTooltip
              step={onboardingStep}
              anchor="bottom"
              isVisible
              onDismiss={completeOnboarding}
              onNext={onboardingStep < 4 ? goToNextOnboardingStep : undefined}
            />
          )}
        </div>

        {showForm && <FoodEntryForm defaultDate={date} onSuccess={() => setShowForm(false)} />}

        {/* AI tips */}
        {tipsLoadErrorMessage !== null && (
          <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
            {tipsLoadErrorMessage}
          </p>
        )}

        {tips !== undefined && tips.length > 0 && (
          <section aria-label={t('ai.tip.generate')} className="space-y-3">
            {tips.map((tip) => (
              <AiTipCard
                key={tip.id}
                tip={tip}
                language={language}
                onDismiss={handleDismiss}
                isDismissing={dismissingId === tip.id}
              />
            ))}
          </section>
        )}

        {/* Low-credit warning — shown when ≤5 credits remain on a trial account */}
        {sub !== undefined &&
          sub.status === 'trial' &&
          sub.creditsRemaining > 0 &&
          sub.creditsRemaining <= 5 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700 dark:bg-amber-950/40">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('credits.remaining_one', { count: sub.creditsRemaining })} —{' '}
                {t('credits.low').toLowerCase()}
              </p>
              <a
                href="/pricing"
                className="ml-4 shrink-0 text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-100"
              >
                {t('credits.upgrade')}
              </a>
            </div>
          )}

        {/* Generate tip + diet buttons */}
        {tips !== undefined && tips.length === 0 && (
          <div className="flex flex-col items-start gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => generateTip()}
                disabled={isGenerating}
                className={cn(
                  'rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-150',
                  'border border-brand-700 text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950',
                  'disabled:opacity-60',
                )}
              >
                {isGenerating ? t('ai.tip.generating') : t('ai.tip.generate')}
              </button>

              <button
                type="button"
                onClick={() => setShowDietPicker(true)}
                className={cn(
                  'rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-150',
                  'border border-warm-300 dark:border-warm-600',
                  selectedDiet
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950 dark:text-brand-400 dark:border-brand-700'
                    : 'text-warm-600 hover:bg-warm-50 dark:text-warm-300 dark:hover:bg-warm-700/50',
                )}
              >
                {selectedDiet ? selectedDiet : t('ai.dietFeedback.chooseDiet')}
              </button>

              {selectedDiet !== null && (
                <button
                  type="button"
                  onClick={handleDietFeedback}
                  disabled={isDietFeedbackGenerating}
                  className={cn(
                    'rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-150',
                    'bg-brand-700 text-white hover:bg-brand-800',
                    'disabled:opacity-60',
                  )}
                >
                  {isDietFeedbackGenerating ? t('ai.tip.generating') : t('ai.dietFeedback.button')}
                </button>
              )}
            </div>

            {tipErrorMessage !== null && (
              <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
                {tipErrorMessage}
              </p>
            )}
            {dietFeedbackErrorMessage !== null && (
              <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
                {dietFeedbackErrorMessage}
              </p>
            )}
          </div>
        )}

        {showDietPicker && (
          <DietPickerModal
            selected={selectedDiet}
            onSelect={setSelectedDiet}
            onClose={() => setShowDietPicker(false)}
          />
        )}

        <DailyView date={date} onAddEntry={() => setShowForm(true)} />
      </div>
    </>
  );
}
