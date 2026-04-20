# NutriApp — Cursor Task Board

> **Cursor:** Read this file at the start of every session.
> Only work on tasks with status `✅ READY`.
> Do not begin a `🔒 PENDING` task — prerequisites are not yet met.
> When finished, notify Claude Code to review and mark `[DONE]`.

---

## Phase 1 — Foundation UI

---

### P1-CUR-01 — FoodEntryCard

**Status:** ✅ READY
**File to create:** `src/components/FoodLog/FoodEntryCard/index.tsx`
**Reference component:** `src/components/FoodLog/DailyView/index.tsx`

**Props** (already in `src/types/components.ts`):

```ts
type FoodEntryCardProps = {
  entry: FoodLogEntry; // imported from '@/lib/db/schema'
  onDelete?: (id: string) => void;
};
```

**Data hook:** `useDeleteFoodEntry()` from `src/hooks/useFoodLog.ts`
Returns: `{ mutate, isPending }`

**Design brief:**
Warm card aesthetic — `bg-warm-50 dark:bg-warm-800` with `rounded-card shadow-card`.
Left border accent `border-l-4` coloured by meal type using CSS custom properties:

- breakfast → `border-brand-500`
- lunch → `border-amber-400`
- dinner → `border-brand-700`
- snack → `border-warm-400`
  Description in `font-sans text-sm text-warm-900 dark:text-warm-100`.
  Timestamp and meal-type badge in muted `text-xs text-warm-500`.
  Delete button: icon-only trash, `text-warm-400 hover:text-red-500`, top-right corner.
  Smooth opacity fade on delete: `transition-opacity duration-200`.

**States to implement:**

- Default: card with description, meal-type badge, formatted time, delete button
- Deleting: delete button shows spinner, card opacity 50%, pointer-events none
- Deleted: optimistic removal handled by the parent DailyView

**Translation keys** (already in both locale files):

- `foodLog.deleteEntry` — "Delete entry" / "Verwijder invoer"
- `foodLog.mealType.breakfast` — "Breakfast" / "Ontbijt"
- `foodLog.mealType.lunch` — "Lunch" / "Lunch"
- `foodLog.mealType.dinner` — "Dinner" / "Diner"
- `foodLog.mealType.snack` — "Snack" / "Snack"

**Accessibility requirements:**

- Delete button: `aria-label={t('foodLog.deleteEntry')}`
- `role="article"` on the card root
- Focus visible ring on delete button: `focus-visible:ring-2 focus-visible:ring-red-400`

**Cursor must not:**

- Use useEffect for data fetching — call `useDeleteFoodEntry()` at component level
- Hardcode any user-visible string — use `useTranslation()`
- Add new npm dependencies without checking with Claude Code first
- Change the props interface

---

### P1-CUR-02 — MealTypeBadge

**Status:** ✅ READY
**File to create:** `src/components/FoodLog/MealTypeBadge/index.tsx`
**Reference component:** `src/components/FoodLog/DailyView/index.tsx`

**Props** (already in `src/types/components.ts`):

```ts
type MealTypeBadgeProps = {
  mealType: MealType; // 'breakfast' | 'lunch' | 'dinner' | 'snack'
};
```

**Data hook:** none — presentational only

**Design brief:**
Pill shape: `inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium`.
Background/text colours per meal type:

- breakfast → `bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200`
- lunch → `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200`
- dinner → `bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-100`
- snack → `bg-warm-200 text-warm-700 dark:bg-warm-700 dark:text-warm-200`

**States to implement:**

- Default: coloured pill with localised label

**Translation keys** (already in both locale files):

- `foodLog.mealType.breakfast`, `foodLog.mealType.lunch`, `foodLog.mealType.dinner`, `foodLog.mealType.snack`

**Accessibility requirements:**

- `aria-label={t(\`foodLog.mealType.${mealType}\`)}` on the span

**Cursor must not:**

- Hardcode any label string — use `useTranslation()`
- Add new npm dependencies
- Change the props interface

---

### P1-CUR-03 — ThemeToggle

**Status:** ✅ READY
**File to create:** `src/components/Layout/ThemeToggle/index.tsx`
**Reference component:** `src/components/Layout/index.tsx` (contains inline toggle; extract + enhance)

**Props** (add to `src/types/components.ts` — no new props needed, all state from store):

```ts
// No props — reads/writes useUIStore directly
type ThemeToggleProps = Record<string, never>;
```

**Data hook:** `useUIStore` from `src/store/uiStore.ts`
Fields used: `theme`, `setTheme`

**Design brief:**
Animated icon button: sun icon (light) / moon icon (dark).
Use Heroicons or inline SVG — no new icon library installs.
Button: `p-2 rounded-full bg-warm-100 dark:bg-warm-700 hover:bg-warm-200 dark:hover:bg-warm-600`.
Icon: `w-5 h-5 text-warm-700 dark:text-warm-200`.
Smooth icon crossfade: CSS `transition-all duration-300`.
No text label — icon only in nav, but include `aria-label`.

**States to implement:**

- Light mode: sun icon shown
- Dark mode: moon icon shown
- Transition: smooth icon swap on click

**Translation keys** (add to both locale files by Claude Code before Cursor starts):

- `nav.toggleTheme` — "Toggle theme" / "Thema wisselen"

**Accessibility requirements:**

- `aria-label={t('nav.toggleTheme')}`
- `aria-pressed={theme === 'dark'}`

**Cursor must not:**

- Install new icon libraries (use inline SVG or Heroicons if already available)
- Hardcode strings — use `useTranslation()`

---

### P1-CUR-04 — LanguageToggle

**Status:** ✅ READY
**File to create:** `src/components/Layout/LanguageToggle/index.tsx`
**Reference component:** `src/components/Layout/index.tsx` (contains inline toggle; extract + enhance)

**Props**:

```ts
// No props — reads/writes useUIStore and i18n directly
type LanguageToggleProps = Record<string, never>;
```

**Data hook:** `useUIStore` from `src/store/uiStore.ts`
Fields used: `language`, `setLanguage`
Also calls `i18n.changeLanguage(lang)` from `react-i18next`

**Design brief:**
Text button showing current language code: `EN` or `NL`.
Style: `text-xs font-mono font-semibold px-2 py-1 rounded-pill border border-warm-300 dark:border-warm-600`.
Active lang: `bg-brand-500 text-white border-brand-500`.
Inactive (alternate): `bg-transparent text-warm-600 dark:text-warm-300 hover:bg-warm-100`.
Show both as a segmented control: `[EN] [NL]` side by side.

**States to implement:**

- EN active: EN button highlighted, NL ghost
- NL active: NL button highlighted, EN ghost

**Translation keys** (already in both locale files):

- `nav.language` — "Language" / "Taal"

**Accessibility requirements:**

- `role="group"` on wrapper, `aria-label={t('nav.language')}`
- Each button: `aria-pressed={language === 'en'}` / `aria-pressed={language === 'nl'}`

**Cursor must not:**

- Call `i18n.changeLanguage` without also calling `setLanguage` on the store
- Hardcode strings

---

## Upcoming Phases (not yet ready)

### P2-CUR-01 — AITipCard

**Status:** 🔒 PENDING (Phase 2 — AI Parsing not started)

### P3-CUR-01 — BarcodeScanner

**Status:** 🔒 PENDING (Phase 3 — Barcode not started)

### P4-CUR-01 — ChatbotDrawer

**Status:** 🔒 PENDING (Phase 4 — Chatbot not started)

### P5-CUR-01 — SubscriptionCard

**Status:** 🔒 PENDING (Phase 5 — Payments not started)
