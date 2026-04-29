import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/utils/cn';
import type { AiTipCardProps } from '@/types/components';
import type { AiTipResponse, AnalysisData } from '@/types/api';

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

function pct(estimated: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((estimated / target) * 100), 150);
}

function barColor(percent: number): string {
  if (percent >= 80) return '#4ade80'; // green-400
  if (percent >= 50) return '#facc15'; // yellow-400
  return '#f87171'; // red-400
}

function DailyChart({ daily }: { daily: AnalysisData['daily'] }) {
  const data = daily.map((m) => ({
    name: m.label,
    percent: pct(m.estimated, m.target),
    estimated: m.estimated,
    target: m.target,
    unit: m.unit,
  }));

  return (
    <div className="mt-4">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
        Daily targets (most recent day)
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
          <XAxis
            type="number"
            domain={[0, 120]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(
              _value,
              _name,
              item: { payload?: { estimated: number; target: number; unit: string } },
            ) => {
              const p = item.payload ?? { estimated: 0, target: 0, unit: '' };
              return [`${p.estimated} / ${p.target} ${p.unit}`, ''] as [string, string];
            }}
            labelFormatter={(label) => String(label)}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <ReferenceLine x={100} stroke="#6b7280" strokeDasharray="4 2" strokeWidth={1} />
          <Bar dataKey="percent" radius={[0, 3, 3, 0]} maxBarSize={18}>
            {data.map((entry, index) => (
              <Cell key={index} fill={barColor(entry.percent)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Exact-value table under the chart */}
      <table className="mt-2 w-full text-xs">
        <thead>
          <tr className="text-warm-400 dark:text-warm-500">
            <th className="py-0.5 text-left font-normal">Nutrient</th>
            <th className="py-0.5 text-right font-normal">Estimated</th>
            <th className="py-0.5 text-right font-normal">Target</th>
            <th className="py-0.5 text-right font-normal">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-100 dark:divide-warm-700">
          {daily.map((m) => {
            const p = pct(m.estimated, m.target);
            return (
              <tr key={m.label}>
                <td className="py-0.5 text-warm-700 dark:text-warm-300">{m.label}</td>
                <td className="py-0.5 text-right tabular-nums text-warm-600 dark:text-warm-400">
                  {m.estimated} {m.unit}
                </td>
                <td className="py-0.5 text-right tabular-nums text-warm-500 dark:text-warm-500">
                  {m.target} {m.unit}
                </td>
                <td
                  className="py-0.5 text-right tabular-nums font-medium"
                  style={{ color: barColor(p) }}
                >
                  {p}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ThirtyDayPanel({ analysis }: { analysis: AnalysisData }) {
  const processingColor =
    analysis.processingLevel === 'minimal'
      ? 'text-green-600 dark:text-green-400'
      : analysis.processingLevel === 'moderate'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="mt-4 rounded-lg bg-warm-100 p-3 dark:bg-warm-700/50">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warm-500 dark:text-warm-400">
        30-day overview
      </p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-xs text-warm-500 dark:text-warm-400">Food variety</dt>
          <dd className="mt-0.5 text-base font-semibold text-warm-800 dark:text-warm-100">
            {analysis.foodVariety}
          </dd>
          <dd className="text-xs text-warm-400 dark:text-warm-500">unique foods</dd>
        </div>
        <div>
          <dt className="text-xs text-warm-500 dark:text-warm-400">Processing</dt>
          <dd className={cn('mt-0.5 text-base font-semibold capitalize', processingColor)}>
            {analysis.processingLevel}
          </dd>
          {analysis.thirtyDay.processingPercent !== null && (
            <dd className="text-xs text-warm-400 dark:text-warm-500">
              {analysis.thirtyDay.processingPercent}% processed
            </dd>
          )}
        </div>
        <div>
          <dt className="text-xs text-warm-500 dark:text-warm-400">Fat quality</dt>
          <dd className="mt-0.5 text-base font-semibold text-warm-800 dark:text-warm-100">
            {analysis.thirtyDay.fatQualityRatio !== null
              ? `${Math.round(analysis.thirtyDay.fatQualityRatio * 100)}%`
              : '—'}
          </dd>
          <dd className="text-xs text-warm-400 dark:text-warm-500">unsaturated</dd>
        </div>
      </dl>
    </div>
  );
}

export function AiTipCard({ tip, language, onDismiss, isDismissing = false }: AiTipCardProps) {
  const { t } = useTranslation();

  const text = language === 'nl' ? tip.tipTextNl : tip.tipTextEn;
  const severityLabel = t(`ai.tip.severity.${tip.severity}`);
  const analysis = tip.analysisData as AnalysisData | null | undefined;

  return (
    <article
      className={cn(
        'relative rounded-card border-l-4 bg-warm-50 p-4 shadow-card transition-opacity duration-300 dark:bg-warm-800',
        SEVERITY_BORDER[tip.severity],
        isDismissing && 'pointer-events-none opacity-50',
      )}
    >
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

      <p className="mt-2 text-sm leading-relaxed text-warm-800 dark:text-warm-100">{text}</p>

      {analysis?.daily && analysis.daily.length > 0 && <DailyChart daily={analysis.daily} />}

      {analysis && <ThirtyDayPanel analysis={analysis} />}
    </article>
  );
}
