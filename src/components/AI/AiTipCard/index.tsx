import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/utils/cn';
import type { AiTipCardProps } from '@/types/components';
import type {
  AiTipResponse,
  AnalysisData,
  AnalysisDailyMetric,
  DailyProcessingEntry,
} from '@/types/api';

type Severity = AiTipResponse['severity'];

const SEVERITY_BORDER: Record<Severity, string> = {
  info: 'border-brand-400',
  suggestion: 'border-amber-400',
  important: 'border-red-400',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  info: 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200',
  suggestion: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  important: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const METRIC_ICONS: Record<string, string> = {
  Protein: '💪',
  Fiber: '🌱',
  'Healthy Fats': '🥑',
  'Net Carbs': '🌾',
  Water: '💧',
  'Added sugar': '🍬',
  Sodium: '🧂',
  'Saturated Fat': '🧈',
};

// Only true plant sources count toward the 30-plant diversity goal
const PLANT_CATEGORIES = [
  { id: 'vegetables', label: 'Vegetables', color: '#4ade80' },
  { id: 'fruits', label: 'Fruits', color: '#fb923c' },
  { id: 'grains', label: 'Whole Grains', color: '#fbbf24' },
  { id: 'fats', label: 'Nuts & Seeds', color: '#c084fc' },
  { id: 'protein', label: 'Legumes', color: '#f87171' },
] as const;

const CEILING_LABELS = new Set(['Added sugar', 'Sodium', 'Saturated Fat']);
const RANGE_LABELS = new Set(['Net Carbs']);

function visualFor(m: AnalysisDailyMetric): 'bar' | 'gauge' | 'range' | 'water' {
  if (m.label === 'Water') return 'water';
  if (m.type === 'ceiling' || CEILING_LABELS.has(m.label)) return 'gauge';
  if (m.type === 'range' || RANGE_LABELS.has(m.label)) return 'range';
  return 'bar';
}

// ─── Derived cross-metric alerts ─────────────────────────────────────────────

type DailyAlerts = {
  lowQualityCarbs: boolean; // high carbs + low fiber
  sodiumWater: boolean; // sodium in warning zone (>70% of limit)
};

function deriveAlerts(daily: AnalysisDailyMetric[]): DailyAlerts {
  const carbs = daily.find((m) => m.label === 'Net Carbs');
  const fiber = daily.find((m) => m.label === 'Fiber');
  const sodium = daily.find((m) => m.label === 'Sodium');

  const carbPct =
    carbs && carbs.target > 0 ? (carbs.estimated / (carbs.targetMax ?? carbs.target)) * 100 : 0;
  const fiberPct = fiber && fiber.target > 0 ? (fiber.estimated / fiber.target) * 100 : 100;
  const sodiumPct = sodium && sodium.target > 0 ? (sodium.estimated / sodium.target) * 100 : 0;

  return {
    lowQualityCarbs: carbPct > 70 && fiberPct < 40,
    sodiumWater: sodiumPct > 70,
  };
}

// ─── Pattern Finder ───────────────────────────────────────────────────────────

function derivePatternInsight(analysis: AnalysisData): string | null {
  const { dailyProcessing, daily, thirtyDay, processingLevel } = analysis;

  // Quality-dial-driven suggestion: if diet is predominantly processed, prioritise fibre/whole-grain swap
  const wholePct =
    thirtyDay.processingPercent !== null
      ? 100 - thirtyDay.processingPercent
      : processingLevel === 'minimal'
        ? 85
        : processingLevel === 'moderate'
          ? 55
          : 20;

  if (wholePct < 50) {
    const fiber = daily.find((m) => m.label === 'Fiber');
    const fiberGap = fiber ? Math.max(0, fiber.target - fiber.estimated) : null;
    if (fiberGap !== null && fiberGap > 5) {
      return `Your food quality dial is in the red — most logged meals are highly processed. Swapping refined grains for whole-grain alternatives (oats, brown rice, lentils) would close your ${fiberGap} g fiber gap and shift the needle toward Farm.`;
    }
    return `Your food quality dial is in the red — most logged meals are highly processed. Prioritise whole-food swaps: vegetables, legumes, and whole grains over packaged alternatives.`;
  }

  if (!dailyProcessing || dailyProcessing.length < 3) return null;

  const minimalDays = dailyProcessing.filter((d) => d.level === 'minimal').length;
  const highDays = dailyProcessing.filter((d) => d.level === 'high').length;
  const total = dailyProcessing.length;

  const fiber = daily.find((m) => m.label === 'Fiber');
  const sodium = daily.find((m) => m.label === 'Sodium');

  // Weekend sodium pattern — check last 28 days for weekend vs weekday sodium
  if (sodium && sodium.estimated > sodium.target * 0.7) {
    const weekendHighDays = dailyProcessing.filter((d) => {
      const day = new Date(d.date).getDay();
      return (day === 0 || day === 6) && d.level === 'high';
    });
    if (weekendHighDays.length >= 2) {
      return `Your processed food intake spikes on weekends — ${weekendHighDays.length} of your last ${total} weekend days were high-processing days. A "Whole Food Sunday" could break the pattern.`;
    }
  }

  // Fiber-processing correlation
  if (fiber) {
    const fiberPct = fiber.target > 0 ? Math.round((fiber.estimated / fiber.target) * 100) : 0;
    if (minimalDays > 0 && highDays > 0 && fiberPct < 50) {
      return `Fiber tends to be low on high-processing days. On your ${minimalDays} whole-food ${minimalDays === 1 ? 'day' : 'days'} you likely hit closer to your 25 g target — today you're at ${fiber.estimated} g (${fiberPct}%).`;
    }
  }

  // General whole food ratio
  if (thirtyDay.processingPercent !== null && thirtyDay.processingPercent > 40) {
    const wholePct = Math.round(100 - thirtyDay.processingPercent);
    return `${wholePct}% of your logged meals are whole or minimally processed. Nudging that above 80% is where the biggest metabolic gains tend to appear.`;
  }

  if (minimalDays >= Math.round(total * 0.7)) {
    return `${minimalDays} of your last ${total} logged days were whole-food days — that's a strong base. Keep the streak going.`;
  }

  return null;
}

// ─── Power-up bar (floor goal) ────────────────────────────────────────────────

function PowerUpBar({
  label,
  estimated,
  target,
  unit,
  warn,
}: AnalysisDailyMetric & { warn?: string }) {
  const raw = target > 0 ? (estimated / target) * 100 : 0;
  const fillPct = Math.min(raw, 100);
  const displayPct = Math.round(raw);
  const reached = raw >= 100;
  const icon = METRIC_ICONS[label] ?? '●';

  const barCls = cn(
    'h-2.5 rounded-full transition-[width] duration-700',
    reached
      ? 'bg-green-400'
      : fillPct > 50
        ? 'bg-blue-400 animate-pulse'
        : 'bg-warm-300 dark:bg-warm-600',
  );

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-warm-800 dark:text-warm-100">
          <span aria-hidden="true">{icon}</span>
          {label}
        </span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-warm-500 dark:text-warm-400">
          {estimated} / {target} {unit}
          {reached && (
            <svg
              className="h-3.5 w-3.5 text-green-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-label="Goal reached"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
      </div>
      <div
        className="w-full overflow-hidden rounded-full bg-warm-100 dark:bg-warm-700"
        style={{ height: 10 }}
      >
        <div className={barCls} style={{ width: `${fillPct}%` }} />
      </div>
      <div className="mt-0.5 flex items-center justify-between text-xs">
        {warn ? <span className="font-medium text-amber-500">{warn}</span> : <span />}
        <span className="text-warm-400">{displayPct}% of daily goal</span>
      </div>
    </div>
  );
}

// ─── Range bar (stay-in-range goal) ──────────────────────────────────────────

function RangeBar({
  label,
  estimated,
  targetMin,
  targetMax,
  unit,
  warn,
}: AnalysisDailyMetric & { warn?: string }) {
  const min = targetMin ?? 0;
  const max = targetMax ?? (estimated * 1.5 || 200);
  const displayMax = max * 1.25;
  const fillPct = Math.min((estimated / displayMax) * 100, 100);
  const minPct = (min / displayMax) * 100;
  const maxPct = (max / displayMax) * 100;
  const inRange = estimated >= min && estimated <= max;
  const underMin = estimated < min;
  const barColor = inRange ? '#4ade80' : underMin ? '#fbbf24' : '#f97316';
  const icon = METRIC_ICONS[label] ?? '●';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-warm-800 dark:text-warm-100">
          <span aria-hidden="true">{icon}</span>
          {label}
        </span>
        <span className="text-xs tabular-nums text-warm-500 dark:text-warm-400">
          {estimated} / {min}–{max} {unit}
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-full bg-warm-100 dark:bg-warm-700"
        style={{ height: 10 }}
      >
        <div
          className="absolute h-full bg-green-100 dark:bg-green-900/40"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
        <div
          className="absolute h-full rounded-full transition-[width] duration-700"
          style={{ width: `${fillPct}%`, backgroundColor: barColor }}
        />
        <div className="absolute top-0 h-full w-px bg-warm-400" style={{ left: `${minPct}%` }} />
      </div>
      <div className="mt-0.5 flex items-center justify-between text-xs">
        <span style={{ color: barColor }}>
          {inRange ? '✓ In range' : underMin ? 'Below goal' : 'Over target'}
        </span>
        {warn ? (
          <span className="font-medium text-amber-500">{warn}</span>
        ) : (
          <span className="text-warm-400">
            goal: {min}–{max} {unit}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Water drop ───────────────────────────────────────────────────────────────

function WaterDrop({ estimated, target, unit, pulse }: AnalysisDailyMetric & { pulse?: boolean }) {
  const uid = useId();
  const pct = Math.min(target > 0 ? (estimated / target) * 100 : 0, 100);
  const fillY = 3 + (1 - pct / 100) * 49;
  const fillH = 52 - fillY;
  const color = pct >= 80 ? '#34d399' : pct >= 50 ? '#60a5fa' : '#93c5fd';
  const displayPct = Math.round(target > 0 ? (estimated / target) * 100 : 0);
  const displayVol =
    estimated >= 1000 ? `${(estimated / 1000).toFixed(1)} L` : `${estimated} ${unit}`;
  const targetVol = target >= 1000 ? `${(target / 1000).toFixed(1)} L` : `${target} ${unit}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 40 54"
        className={cn('w-12', pulse && 'animate-pulse')}
        aria-label={`Water: ${displayPct}%`}
      >
        <defs>
          <clipPath id={uid}>
            <path d="M20,3 C32,16 38,27 38,35 A18,18 0 1 1 2,35 C2,27 8,16 20,3 Z" />
          </clipPath>
        </defs>
        <path
          d="M20,3 C32,16 38,27 38,35 A18,18 0 1 1 2,35 C2,27 8,16 20,3 Z"
          fill="#e5e7eb"
          stroke={pulse ? '#f97316' : '#d1d5db'}
          strokeWidth={pulse ? '1.5' : '0.5'}
        />
        {fillH > 0 && (
          <rect x="0" y={fillY} width="40" height={fillH} fill={color} clipPath={`url(#${uid})`} />
        )}
        <circle cx="13" cy="29" r="3" fill="white" opacity="0.35" />
      </svg>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>
        {displayPct}%
      </span>
      <span className="text-xs font-medium text-warm-700 dark:text-warm-200">Water</span>
      <span className="text-xs tabular-nums text-warm-400">
        {displayVol} / {targetVol}
      </span>
      {pulse && (
        <span className="mt-0.5 text-center text-xs font-medium text-amber-500">
          High sodium → drink more
        </span>
      )}
    </div>
  );
}

// ─── Budget gauge ─────────────────────────────────────────────────────────────

function BudgetGauge({ label, estimated, target, unit }: AnalysisDailyMetric) {
  const raw = target > 0 ? (estimated / target) * 100 : 0;
  const filled = Math.min(raw, 100);
  const displayPct = Math.round(raw);
  const icon = METRIC_ICONS[label] ?? '●';

  const color =
    displayPct > 100
      ? '#dc2626'
      : displayPct > 90
        ? '#ef4444'
        : displayPct > 70
          ? '#f97316'
          : '#10b981';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base leading-none" aria-hidden="true">
        {icon}
      </span>
      <div className="relative w-full max-w-[88px]">
        <svg viewBox="0 0 100 56" className="w-full overflow-visible" aria-hidden="true">
          <path
            d="M 8 48 A 40 40 0 0 1 92 48"
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            className="stroke-warm-100 dark:stroke-warm-700"
          />
          <path
            d="M 8 48 A 40 40 0 0 1 92 48"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${filled} 100`}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <span className="text-xs font-bold tabular-nums" style={{ color }}>
            {displayPct}%
          </span>
        </div>
      </div>
      <span className="text-center text-xs font-medium leading-tight text-warm-700 dark:text-warm-200">
        {label}
      </span>
      <span className="text-center text-xs tabular-nums text-warm-400">
        {estimated}/{target} {unit}
      </span>
    </div>
  );
}

// ─── Plant Points info modal ──────────────────────────────────────────────────

function PlantPointsModal({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Plant Points explained"
    >
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-warm-800">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
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

        {/* Header */}
        <div className="mb-5 pr-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            Plant Points
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-warm-900 dark:text-warm-50">
            Why 30 Plants?
          </h2>
        </div>

        {/* Section A: The Science */}
        <div className="mb-5">
          <p className="text-sm leading-relaxed text-warm-700 dark:text-warm-200">
            Research shows that people who eat at least <strong>30 different plants a week</strong>{' '}
            have a much healthier gut microbiome — the community of good bacteria in your digestive
            system. This leads to better immunity, improved mood, and steadier energy levels.
            It&apos;s not about the <em>amount</em> you eat, but the <em>variety</em>.
          </p>
        </div>

        {/* Reset logic callout */}
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
            Rolling 7-day window
          </p>
          <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            Each unique plant counts as <strong>1 point per week</strong>. Eating an apple on Monday
            and Tuesday still gives you just 1 point — variety is the goal, not repetition. Your
            score resets every 7 days.
          </p>
        </div>

        {/* Section B: What counts */}
        <div className="mb-5">
          <p className="mb-3 text-sm font-semibold text-warm-800 dark:text-warm-100">
            What counts as a point?
          </p>
          <div className="space-y-3">
            {[
              {
                icon: '🥦',
                label: 'Vegetables',
                examples: 'Spinach, carrots, onions, broccoli',
                points: '1 pt each',
              },
              {
                icon: '🍎',
                label: 'Fruits',
                examples: 'Apples, berries, bananas, citrus',
                points: '1 pt each',
              },
              {
                icon: '🌾',
                label: 'Whole Grains',
                examples: 'Oats, quinoa, brown rice, buckwheat',
                points: '1 pt each',
              },
              {
                icon: '🥜',
                label: 'Nuts & Seeds',
                examples: 'Almonds, chia seeds, walnuts, pumpkin seeds',
                points: '1 pt each',
              },
              {
                icon: '🫘',
                label: 'Legumes',
                examples: 'Lentils, chickpeas, black beans, peas',
                points: '1 pt each',
              },
              {
                icon: '🌿',
                label: 'Herbs & Spices',
                examples: 'Garlic, ginger, turmeric, basil',
                points: '¼ pt each (1 pt if fresh)',
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3">
                <span className="text-xl leading-none">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-warm-800 dark:text-warm-100">
                      {row.label}
                    </p>
                    <span className="shrink-0 text-xs text-brand-600 dark:text-brand-400 font-medium">
                      {row.points}
                    </span>
                  </div>
                  <p className="text-xs text-warm-400">{row.examples}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section C: Pro tips */}
        <div>
          <p className="mb-3 text-sm font-semibold text-warm-800 dark:text-warm-100">
            Tips to score higher
          </p>
          <div className="space-y-2.5">
            {[
              {
                icon: '🛒',
                tip: 'Buy "mixed" frozen berries or "mixed" greens — a 4-leaf mix is 4 points instantly.',
              },
              {
                icon: '🌈',
                tip: 'Try the Rainbow Rule: pick one plant for every colour of the rainbow each week.',
              },
              {
                icon: '🔄',
                tip: 'Swap white rice for a 7-grain blend and add 7 points to your week in one meal.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg bg-warm-50 dark:bg-warm-700/50 px-3 py-2.5"
              >
                <span className="text-base leading-none mt-0.5">{item.icon}</span>
                <p className="text-xs leading-relaxed text-warm-600 dark:text-warm-300">
                  {item.tip}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Plant Points ring ────────────────────────────────────────────────────────

const PLANT_GOAL = 30; // 30 plants / week target

function PlantPointsRing({ categories, variety }: { categories?: string[]; variety: number }) {
  const [showModal, setShowModal] = useState(false);
  const activeSet = new Set(categories ?? []);
  const activePlantCats = PLANT_CATEGORIES.filter((c) => activeSet.has(c.id));
  const plantCatCount = activePlantCats.length;

  // Ring shows only plant categories; non-plant categories (dairy, drinks, other) are excluded
  const slices = PLANT_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: 1,
    fill: activeSet.has(cat.id) ? cat.color : '#e5e7eb',
  }));

  const pct = Math.min((variety / PLANT_GOAL) * 100, 100);
  const grade =
    pct >= 100
      ? { label: 'Excellent', color: '#10b981' }
      : pct >= 67
        ? { label: 'Good', color: '#4ade80' }
        : pct >= 33
          ? { label: 'Growing', color: '#fbbf24' }
          : { label: 'Start', color: '#f87171' };

  return (
    <div className="flex flex-col items-center">
      {showModal && <PlantPointsModal onClose={() => setShowModal(false)} />}
      <div className="mb-2 flex items-center gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
          Plant Points
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          aria-label="Learn more about Plant Points"
          className="flex h-4 w-4 items-center justify-center rounded-full bg-warm-200 text-warm-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-warm-600 dark:text-warm-300 dark:hover:bg-brand-900 dark:hover:text-brand-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        >
          <span className="text-[9px] font-bold leading-none">i</span>
        </button>
      </div>
      <div className="relative">
        <PieChart width={120} height={120}>
          <Pie
            data={slices}
            cx={60}
            cy={60}
            innerRadius={35}
            outerRadius={54}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
          >
            {slices.map((s, i) => (
              <Cell key={i} fill={s.fill} />
            ))}
          </Pie>
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-none" style={{ color: grade.color }}>
            {variety}
          </span>
          <span className="text-xs text-warm-400">/ {PLANT_GOAL}</span>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold" style={{ color: grade.color }}>
        {grade.label}
      </p>
      <p className="text-xs text-warm-400">{plantCatCount} / 5 plant categories</p>
      <p className="mt-1 text-center text-xs text-warm-400 dark:text-warm-500">
        Goal: {PLANT_GOAL} unique plants / week
      </p>
      {plantCatCount > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
          {activePlantCats.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1 text-xs text-warm-500 dark:text-warm-400"
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              {c.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Processing ratio dial (needle gauge) ────────────────────────────────────

function ProcessingDial({
  processingPercent,
  processingLevel,
}: {
  processingPercent: number | null;
  processingLevel: 'minimal' | 'moderate' | 'high';
}) {
  // wholePct: 0 = all processed (left/red), 100 = all whole (right/green)
  const rawWhole =
    processingPercent !== null
      ? 100 - processingPercent
      : processingLevel === 'minimal'
        ? 85
        : processingLevel === 'moderate'
          ? 55
          : 20;

  const wholePct = Math.max(0, Math.min(100, rawWhole));

  // Needle angle: -90° (left, 0% whole) to +90° (right, 100% whole)
  const angleDeg = -90 + (wholePct / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const cx = 60,
    cy = 58,
    r = 36;
  const nx = cx + r * Math.cos(angleRad);
  const ny = cy + r * Math.sin(angleRad);

  const grade =
    wholePct >= 80
      ? { label: `${Math.round(wholePct)}% Whole Foods`, color: '#10b981' }
      : wholePct >= 60
        ? { label: `${Math.round(wholePct)}% Whole Foods`, color: '#4ade80' }
        : wholePct >= 40
          ? { label: `${Math.round(wholePct)}% Whole Foods`, color: '#fbbf24' }
          : { label: `${Math.round(wholePct)}% Whole Foods`, color: '#ef4444' };

  // Arc path for gradient feel: 3 segments (red, amber, green)
  const segments = [
    { from: -90, to: -30, color: '#ef4444' },
    { from: -30, to: 30, color: '#fbbf24' },
    { from: 30, to: 90, color: '#10b981' },
  ];

  function arcPath(fromDeg: number, toDeg: number) {
    const f = (fromDeg * Math.PI) / 180;
    const t = (toDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(f),
      y1 = cy + r * Math.sin(f);
    const x2 = cx + r * Math.cos(t),
      y2 = cy + r * Math.sin(t);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }

  return (
    <div className="flex flex-col items-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
        Food Quality
      </p>
      <svg viewBox="-8 0 136 72" className="w-36" aria-label={grade.label}>
        {/* Track segments */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={arcPath(seg.from, seg.to)}
            fill="none"
            stroke={seg.color}
            strokeWidth="8"
            strokeLinecap="butt"
            opacity="0.25"
          />
        ))}
        {/* Active arc from left to needle */}
        <path
          d={arcPath(-90, angleDeg)}
          fill="none"
          stroke={grade.color}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3" fill="#374151" />
        {/* Labels */}
        <text x="18" y="68" fontSize="7" fill="#ef4444" textAnchor="middle">
          Factory
        </text>
        <text x="110" y="68" fontSize="7" fill="#10b981" textAnchor="middle">
          Farm
        </text>
      </svg>
      <p className="mt-0.5 text-sm font-bold" style={{ color: grade.color }}>
        {grade.label}
      </p>
      <p className="text-xs text-warm-400">this log period</p>
    </div>
  );
}

// ─── Processing heat map ──────────────────────────────────────────────────────

function ProcessingHeatMap({ dailyProcessing }: { dailyProcessing?: DailyProcessingEntry[] }) {
  const today = new Date();
  const grid = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (27 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const found = dailyProcessing?.find((dp) => dp.date === dateStr);
    return { date: dateStr, level: found?.level ?? null };
  });

  const cellColor = (level: string | null) => {
    if (level === 'minimal') return '#4ade80';
    if (level === 'moderate') return '#facc15';
    if (level === 'high') return '#f87171';
    return '#e5e7eb';
  };

  // Group into weeks of 7, label with Mon–Sun day initials
  const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weeks = [grid.slice(0, 7), grid.slice(7, 14), grid.slice(14, 21), grid.slice(21, 28)];

  // Count green week streaks
  const greenWeeks = weeks.filter(
    (w) =>
      w.some((d) => d.level !== null) && w.every((d) => d.level === 'minimal' || d.level === null),
  ).length;

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="mb-1 flex gap-1.5 pl-0">
        {DAY_INITIALS.map((d, i) => (
          <div
            key={i}
            className="flex h-4 w-4 flex-none items-center justify-center text-[9px] text-warm-300 dark:text-warm-600"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5">
            {week.map((day, di) => (
              <div
                key={di}
                className="h-4 w-4 flex-none rounded-sm"
                style={{ backgroundColor: cellColor(day.level) }}
                title={`${day.date}: ${day.level ?? 'no data'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-warm-400">
        <div className="flex gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 flex-none rounded-sm bg-green-400" />
            Whole
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 flex-none rounded-sm bg-yellow-400" />
            Mixed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 flex-none rounded-sm bg-red-400" />
            Processed
          </span>
        </div>
        {greenWeeks > 0 && (
          <span className="font-medium text-green-500">
            🟢 {greenWeeks} green {greenWeeks === 1 ? 'week' : 'weeks'}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pattern insight banner ───────────────────────────────────────────────────

function PatternInsight({ insight }: { insight: string }) {
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 dark:border-brand-800 dark:bg-brand-950">
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
        Pattern found
      </p>
      <p className="text-xs leading-relaxed text-warm-700 dark:text-warm-200">{insight}</p>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function AiTipCard({ tip, language, onDismiss, isDismissing = false }: AiTipCardProps) {
  const { t } = useTranslation();

  const text = language === 'nl' ? tip.tipTextNl : tip.tipTextEn;
  const severityLabel = t(`ai.tip.severity.${tip.severity}`);
  const analysis = tip.analysisData as AnalysisData | null | undefined;

  const barMetrics = analysis?.daily.filter((m) => visualFor(m) === 'bar') ?? [];
  const rangeMetrics = analysis?.daily.filter((m) => visualFor(m) === 'range') ?? [];
  const waterMetric = analysis?.daily.find((m) => visualFor(m) === 'water');
  const gaugeMetrics = analysis?.daily.filter((m) => visualFor(m) === 'gauge') ?? [];

  const alerts = analysis ? deriveAlerts(analysis.daily) : null;
  const insight = analysis ? derivePatternInsight(analysis) : null;

  return (
    <article
      className={cn(
        'relative rounded-card border-l-4 bg-warm-50 p-4 shadow-card transition-opacity duration-300 dark:bg-warm-800',
        SEVERITY_BORDER[tip.severity],
        isDismissing && 'pointer-events-none opacity-50',
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <span
          aria-label={severityLabel}
          className={cn(
            'inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium',
            SEVERITY_BADGE[tip.severity],
          )}
        >
          {severityLabel}
        </span>
        <button
          type="button"
          onClick={() => onDismiss(tip.id)}
          disabled={isDismissing}
          aria-label={t('ai.tip.dismiss')}
          className={cn(
            'shrink-0 rounded-full p-1 text-warm-400 transition-colors hover:text-warm-700 dark:hover:text-warm-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
          )}
        >
          {isDismissing ? (
            <svg
              className="h-4 w-4 animate-spin"
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
              className="h-4 w-4"
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
          )}
        </button>
      </div>

      {/* ── Tip text ── */}
      <p className="mt-2 text-sm leading-relaxed text-warm-800 dark:text-warm-100">{text}</p>

      {/* ── Daily targets ── */}
      {analysis && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
            Daily targets — most recent day
          </p>

          {/* A: Essential intake bars */}
          {(barMetrics.length > 0 || rangeMetrics.length > 0) && (
            <div className="space-y-3">
              {barMetrics.map((m) => (
                <PowerUpBar
                  key={m.label}
                  {...m}
                  warn={
                    m.label === 'Fiber' && alerts?.lowQualityCarbs
                      ? 'Low fiber with high carbs — choose whole grains'
                      : undefined
                  }
                />
              ))}
              {rangeMetrics.map((m) => (
                <RangeBar
                  key={m.label}
                  {...m}
                  warn={
                    m.label === 'Net Carbs' && alerts?.lowQualityCarbs
                      ? 'High carbs, low fiber — low-quality energy'
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {/* B: Hydration */}
          {waterMetric && (
            <div className="mt-5 flex justify-center">
              <WaterDrop {...waterMetric} pulse={alerts?.sodiumWater} />
            </div>
          )}

          {/* C: Daily limits */}
          {gaugeMetrics.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
                Daily limits
              </p>
              <div className="grid grid-cols-3 gap-2">
                {gaugeMetrics.map((m) => (
                  <BudgetGauge key={m.label} {...m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 30-day overview ── */}
      {analysis && (
        <div className="mt-5 space-y-5 border-t border-warm-100 pt-4 dark:border-warm-700">
          <p className="text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
            30-day overview
          </p>

          {/* Pattern insight */}
          {insight && <PatternInsight insight={insight} />}

          {/* Plant points + Processing dial side by side */}
          <div className="grid grid-cols-2 gap-4">
            <PlantPointsRing categories={analysis.foodCategories} variety={analysis.foodVariety} />
            <ProcessingDial
              processingPercent={analysis.thirtyDay.processingPercent}
              processingLevel={analysis.processingLevel}
            />
          </div>

          {/* Processing heat map */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
              Consistency (28 days)
            </p>
            <ProcessingHeatMap dailyProcessing={analysis.dailyProcessing} />
          </div>
        </div>
      )}
    </article>
  );
}
