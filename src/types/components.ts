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
  userId: string;
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
