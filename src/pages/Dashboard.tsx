import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { authClient } from '@/lib/auth/client';
import { useUIStore } from '@/store/uiStore';
import { todayISO, formatDate } from '@/utils/date';
import { DailyView } from '@/components/FoodLog/DailyView';
import { FoodEntryForm } from '@/components/FoodLog/FoodEntryForm';
import { AiTipCard } from '@/components/AI/AiTipCard';
import { PaywallModal } from '@/components/Payments/PaywallModal';
import { OnboardingTooltip } from '@/components/UI/OnboardingTooltip';
import { useAiTips, useDismissTip, useGenerateTip } from '@/hooks/useAiTips';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/utils/cn';

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
  const { data: session } = authClient.useSession();
  const language = useUIStore((s) => s.language);
  const [date, setDate] = useState(todayISO());
  const [showForm, setShowForm] = useState(false);
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

  const { data: tips } = useAiTips();
  const { mutate: dismissTip } = useDismissTip();
  const { mutate: generateTip, isPending: isGenerating, error: tipError } = useGenerateTip();

  const handleDismiss = (id: string) => {
    setDismissingId(id);
    dismissTip(id, { onSettled: () => setDismissingId(null) });
  };

  const tipErrorMessage = (() => {
    if (!tipError) return null;
    const msg = tipError instanceof Error ? tipError.message : '';
    if (msg === 'insufficient_credits') return t('ai.tip.insufficientCredits');
    if (msg === 'not_enough_data') return t('ai.tip.notEnoughData');
    return t('common.error');
  })();

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

  if (!session?.user) return null;

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

        {/* Generate tip button — shown when no active tips */}
        {tips !== undefined && tips.length === 0 && (
          <div className="flex flex-col items-start gap-2">
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
            {tipErrorMessage !== null && (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {tipErrorMessage}
              </p>
            )}
          </div>
        )}

        <DailyView date={date} onAddEntry={() => setShowForm(true)} />
      </div>
    </>
  );
}
