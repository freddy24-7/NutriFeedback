export function confidenceColour(score: number): string {
  if (score >= 0.7) return 'text-brand-700 dark:text-brand-400';
  if (score >= 0.4) return 'text-amber-500 dark:text-amber-400';
  return 'text-warm-400 dark:text-warm-500';
}

export function confidenceLabel(score: number): string {
  if (score >= 0.7) return 'High confidence';
  if (score >= 0.4) return 'Medium confidence';
  return 'Low confidence';
}
