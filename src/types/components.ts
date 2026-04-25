import type { FoodLogEntry } from '@/lib/db/schema';
import type { MealType } from './api';

// ─── FoodEntryForm ────────────────────────────────────────────────────────────

export type FoodEntryFormProps = {
  onSuccess?: () => void;
  defaultDate?: string;
};

// ─── FoodEntryCard ────────────────────────────────────────────────────────────

export type FoodEntryCardProps = {
  entry: FoodLogEntry;
  onDelete?: (id: string) => void;
};

// ─── DailyView ────────────────────────────────────────────────────────────────

export type DailyViewProps = {
  date: string;
  onAddEntry?: () => void;
};

// ─── MealTypeBadge ────────────────────────────────────────────────────────────

export type MealTypeBadgeProps = {
  mealType: MealType;
};

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

export type ProtectedRouteProps = {
  redirectTo?: string;
};

// ─── Phase 2 — AI components ──────────────────────────────────────────────────

import type { ParsedNutrients, AiTipResponse, ProductResponse } from './api';

export type ConfidenceBadgeProps = {
  confidence: number;
};

export type NutrientMiniChartProps = {
  nutrients: ParsedNutrients;
};

export type AiTipCardProps = {
  tip: AiTipResponse;
  language: 'en' | 'nl';
  onDismiss: (id: string) => void;
  isDismissing?: boolean;
};

// ─── Phase 3 — Barcode components ─────────────────────────────────────────────

export type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};

export type ProductCardProps = {
  product: ProductResponse;
  onConfirm: (product: ProductResponse) => void;
  onDismiss: () => void;
};

// ─── Phase 4 — Payments components ───────────────────────────────────────────

import type { SubscriptionResponse, SubscriptionStatus } from './api';

export type CreditCounterProps = {
  creditsRemaining: number;
  creditsExpiresAt: string | null;
};

export type SubscriptionStatusBadgeProps = {
  status: SubscriptionStatus;
};

export type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'no_credits' | 'expired';
};

export type DiscountCodeInputProps = {
  onSuccess?: (result: { granted: boolean; type: string }) => void;
};

export type PricingCardProps = {
  subscription: SubscriptionResponse;
  priceId: string;
  priceDisplay: string;
};
