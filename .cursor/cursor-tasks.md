# NutriApp — Cursor Task Board

> **Cursor:** Read this file at the start of every session.
> Only work on tasks with status `✅ READY`.
> Do not begin a `🔒 PENDING` task — prerequisites are not yet met.
> When finished, notify Claude Code to review and mark `[DONE]`.

---

## Phase 1 — Foundation UI

---

### P1-CUR-01 — FoodEntryCard

**Status:** ✅ DONE
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

**Status:** ✅ DONE
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

**Status:** ✅ DONE
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

**Status:** ✅ DONE
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

---

## Phase 2 — AI Integration UI

---

### P2-CUR-01 — ConfidenceBadge

**Status:** ✅ DONE
**File to create:** `src/components/AI/ConfidenceBadge/index.tsx`
**Reference component:** `src/components/FoodLog/MealTypeBadge/index.tsx` _(build P1-CUR-02 first)_

**Props** (already in `src/types/components.ts`):

```ts
type ConfidenceBadgeProps = {
  confidence: number; // 0.0–1.0
};
```

**Data hook:** none — presentational only

**Design brief:**
Pill badge with coloured dot indicator. Three tiers:

- `confidence >= 0.7` → green: `bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200` + green dot
- `confidence >= 0.4` → amber: `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200` + amber dot
- `confidence < 0.4` → grey: `bg-warm-200 text-warm-600 dark:bg-warm-700 dark:text-warm-300` + grey dot

Dot: `w-1.5 h-1.5 rounded-full` inline before the label text.
Shape: `inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium`.

**States to implement:**

- High (≥0.7): green badge — "High confidence"
- Medium (0.4–0.69): amber badge — "Medium confidence"
- Low (<0.4): grey badge — "Low confidence (estimate)"

**Translation keys** (already in both locale files):

- `nutrients.confidence.high` — "High confidence" / "Hoge betrouwbaarheid"
- `nutrients.confidence.medium` — "Medium confidence" / "Gemiddelde betrouwbaarheid"
- `nutrients.confidence.low` — "Low confidence (estimate)" / "Lage betrouwbaarheid (schatting)"
- `nutrients.confidence.label` — "Confidence" / "Betrouwbaarheid"

**Accessibility requirements:**

- `aria-label={t('nutrients.confidence.label') + ': ' + labelText}`
- `title={labelText}` for tooltip on hover

**Cursor must not:**

- Add new npm dependencies
- Hardcode label strings — use `useTranslation()`
- Change the props interface

---

### P2-CUR-02 — NutrientMiniChart

**Status:** ✅ DONE
**File to create:** `src/components/AI/NutrientMiniChart/index.tsx`
**Reference component:** `src/components/AI/ConfidenceBadge/index.tsx` _(build P2-CUR-01 first)_

**Props** (already in `src/types/components.ts`):

```ts
type NutrientMiniChartProps = {
  nutrients: ParsedNutrients; // imported from '@/types/api'
};
```

**Data hook:** none — presentational only

**Design brief:**
Compact horizontal bar chart — pure CSS, no chart library.
Show: calories (kcal), protein (g), carbs (g), fat (g). Omit null values.
Each row: label left-aligned in `font-mono text-xs text-warm-500`, bar in middle, value right-aligned in `font-mono text-xs`.

Bar container: `flex-1 mx-2 h-1.5 rounded-full bg-warm-200 dark:bg-warm-700`.
Bar fill: `h-full rounded-full transition-all duration-500`.
Bar colours:

- calories → `bg-amber-400`
- protein → `bg-brand-500`
- carbs → `bg-brand-300`
- fat → `bg-warm-400`

Max bar width is relative to the highest value in the set (percentage of max).
Wrap in `rounded-card p-3 bg-warm-50 dark:bg-warm-800 border border-warm-200 dark:border-warm-700`.

**States to implement:**

- All values present: full chart
- Some values null: skip those rows (no empty bars)
- All values null: return `null` (render nothing)

**Translation keys** (already in both locale files):

- `nutrients.calories`, `nutrients.protein`, `nutrients.carbs`, `nutrients.fat`
- `nutrients.unit.kcal`, `nutrients.unit.g`

**Accessibility requirements:**

- `role="img"` on the chart container
- `aria-label` describing the nutrient summary (e.g. "Nutrient summary: 320 kcal, 12g protein")

**Cursor must not:**

- Install a chart library — pure CSS bars only
- Show bars for null values
- Change the props interface

---

### P2-CUR-03 — AiTipCard

**Status:** ✅ DONE
**File to create:** `src/components/AI/AiTipCard/index.tsx`
**Reference component:** `src/components/FoodLog/FoodEntryCard/index.tsx` _(build P1-CUR-01 first)_

**Props** (already in `src/types/components.ts`):

```ts
type AiTipCardProps = {
  tip: AiTipResponse; // imported from '@/types/api'
  language: 'en' | 'nl';
  onDismiss: (id: string) => void;
  isDismissing?: boolean;
};
```

**Data hooks:**

- `useAiTips()` — from `src/hooks/useAiTips.ts` — returns `{ data, isLoading }`
- `useDismissTip()` — from `src/hooks/useAiTips.ts` — returns `{ mutate, isPending }`

**Design brief:**
Card with left accent border coloured by severity:

- `info` → `border-l-4 border-brand-400`
- `suggestion` → `border-l-4 border-amber-400`
- `important` → `border-l-4 border-red-400`

Card surface: `bg-warm-50 dark:bg-warm-800 rounded-card shadow-card p-4`.
Severity badge (top-right): small pill using `ai.tip.severity.*` translation.
Tip text: `text-sm text-warm-800 dark:text-warm-100 leading-relaxed`.
Dismiss button: icon-only × button, `text-warm-400 hover:text-warm-700`, top-right corner.
Fade-out on dismiss: `transition-opacity duration-300 opacity-50` when `isDismissing`.

**States to implement:**

- Default: tip text + severity badge + dismiss button
- Dismissing: opacity 50%, button shows spinner
- Language: `tip.tipTextEn` when `language === 'en'`, `tip.tipTextNl` when `language === 'nl'`

**Translation keys** (already in both locale files):

- `ai.tip.dismiss` — "Dismiss tip" / "Tip sluiten"
- `ai.tip.severity.info`, `ai.tip.severity.suggestion`, `ai.tip.severity.important`

**Accessibility requirements:**

- `role="article"` on card root
- Dismiss button: `aria-label={t('ai.tip.dismiss')}`
- Severity badge: `aria-label={severityLabel}`

**Cursor must not:**

- Use `useAiTips()` or `useDismissTip()` inside the card — the parent passes tip data and onDismiss as props
- Hardcode tip text — always use `tip.tipTextEn` or `tip.tipTextNl` based on `language` prop
- Change the props interface

---

## Phase 3 — Barcode + Product Database

---

### P3-CUR-01 — BarcodeScanner

**Status:** ✅ DONE
**File to create:** `src/components/Barcode/BarcodeScanner/index.tsx`
**Reference component:** `src/components/FoodLog/FoodEntryForm/index.tsx`

**Props** (add to `src/types/components.ts`):

```ts
type BarcodeScannerProps = {
  onScan: (barcode: string) => void;
  onClose: () => void;
};
```

**Data hook:** none — uses `@zxing/browser` directly inside the component

**Design brief:**
Full-screen overlay modal. Dark semi-transparent background (`bg-black/80`).
Camera viewfinder: centred square with rounded corners, `border-2 border-brand-400`.
Animated scan line: thin horizontal line (`h-0.5 bg-brand-400 opacity-75`) moving top→bottom with CSS keyframe animation (`animate-scan-line`).
Close button: top-right corner × icon, `text-white hover:text-warm-200`.
Status text below viewfinder: "Point camera at barcode" / "Scanning..." / error message.
Add custom keyframe to `tailwind.config.ts`:

```js
keyframes: { scanLine: { '0%,100%': { top: '10%' }, '50%': { top: '85%' } } },
animation: { 'scan-line': 'scanLine 2s ease-in-out infinite' }
```

**States to implement:**

- Initialising: spinner while camera permission requested
- Scanning: viewfinder + animated scan line
- Error: camera permission denied or device not supported — show inline message, keep close button

**ZXing usage pattern:**

```ts
import { BrowserMultiFormatReader } from '@zxing/browser';
const reader = new BrowserMultiFormatReader();
// In useEffect, call reader.decodeFromConstraints(constraints, videoElement, callback)
// Clean up with BrowserMultiFormatReader.releaseAllStreams() in effect cleanup
```

**Translation keys** (add to both locale files before Cursor starts):

- `barcode.scanning` — "Scanning…" / "Scannen…"
- `barcode.pointCamera` — "Point camera at barcode" / "Richt camera op barcode"
- `barcode.permissionDenied` — "Camera access denied" / "Cameratoegang geweigerd"
- `barcode.notSupported` — "Barcode scanning not supported on this device" / "Barcodescannen niet ondersteund op dit apparaat"
- `barcode.close` — "Close scanner" / "Scanner sluiten"

**Accessibility requirements:**

- `role="dialog"` + `aria-modal="true"` + `aria-label={t('barcode.scanning')}` on overlay
- Close button: `aria-label={t('barcode.close')}`
- Trap focus inside modal while open

**Cursor must not:**

- Install a different barcode library — use `@zxing/browser` which is already in `package.json`
- Add new npm dependencies
- Call any API — `onScan(barcode)` returns the raw barcode string to the parent

---

### P3-CUR-02 — ProductCard

**Status:** ✅ DONE
**File to create:** `src/components/Barcode/ProductCard/index.tsx`
**Reference component:** `src/components/FoodLog/FoodEntryCard/index.tsx`

**Props** (add to `src/types/components.ts`):

```ts
type ProductCardProps = {
  product: ProductResponse; // from '@/types/api'
  onConfirm: (product: ProductResponse) => void;
  onDismiss: () => void;
};
```

**Data hook:** none — presentational, receives product via props

**Design brief:**
Card with product details and a confirm button to add to food log.
Surface: `bg-warm-50 dark:bg-warm-800 rounded-card shadow-card p-4`.
Product name: `font-sans font-semibold text-warm-900 dark:text-warm-100`.
Brand: `text-sm text-warm-500` below name.
Source badge: small pill — `open_food_facts` → `bg-brand-100 text-brand-800`, `usda` → `bg-amber-100 text-amber-800`, `ai_estimated` → `bg-warm-200 text-warm-600`, `user` → `bg-brand-200 text-brand-900`.
Processing level indicator: 4 coloured squares (`w-3 h-3 rounded-sm`):

- Level 1: all green (`bg-brand-500`)
- Level 2: 2 green, 2 grey
- Level 3: 3 amber, 1 grey
- Level 4: all red (`bg-red-500`)
  Show `NutrientMiniChart` if nutrients are present.
  Confirm button: `bg-brand-500 text-white rounded-pill px-4 py-2`.
  Dismiss link: `text-sm text-warm-400 hover:text-warm-700 underline`.

**Translation keys:**

- `barcode.confirmAdd` — "Add to food log" / "Toevoegen aan logboek"
- `barcode.dismiss` — "Not this product" / "Niet dit product"
- `barcode.source.open_food_facts` — "Open Food Facts" / "Open Food Facts"
- `barcode.source.usda` — "USDA" / "USDA"
- `barcode.source.ai_estimated` — "AI estimate" / "AI-schatting"
- `barcode.source.user` — "User registered" / "Door gebruiker toegevoegd"
- `barcode.processingLevel` — "Processing level" / "Bewerkingsniveau"

**Accessibility requirements:**

- `role="article"` on card root
- Confirm button: `aria-label={t('barcode.confirmAdd')}`
- Processing level: `aria-label={t('barcode.processingLevel') + ': ' + level}`

**Cursor must not:**

- Call any API or hooks — parent handles all data fetching
- Change the props interface

---

## Phase 4 — Payments + Credits UI

---

### P4-CUR-01 — CreditCounter

**Status:** ✅ READY
**File to create:** `src/components/Payments/CreditCounter/index.tsx`
**Reference component:** `src/components/AI/ConfidenceBadge/index.tsx`

**Props** (already in `src/types/components.ts`):

```ts
type CreditCounterProps = {
  creditsRemaining: number;
  creditsExpiresAt: string | null; // ISO string or null (null = unlimited)
};
```

**Data hook:** `useSubscription()` from `src/hooks/useSubscription.ts`
Returns: `{ data: SubscriptionResponse | undefined, isLoading }`
Parent reads `data.creditsRemaining` and `data.creditsExpiresAt` and passes them as props.

**Design brief:**
Compact counter for the navigation bar. Two sub-states:

- **Unlimited** (`creditsExpiresAt === null`, status `comped`): show a small infinity symbol or star icon in `text-brand-500`, no number. `aria-label="Unlimited access"`.
- **Credit count**: pill badge — `bg-warm-100 dark:bg-warm-800 border border-warm-300 dark:border-warm-600 rounded-pill px-2 py-0.5 text-xs font-mono`.
  - `creditsRemaining > 10` → count in `text-warm-700 dark:text-warm-200`
  - `creditsRemaining 1–10` → amber: `text-amber-600 dark:text-amber-400`
  - `creditsRemaining === 0` → red: `text-red-500`
  - Show expiry days remaining if `creditsExpiresAt` is set and within 7 days: `"3 days left"` in `text-xs text-warm-400` below the count.

**Translation keys** (add to both locale files before building):

- `credits.remaining` — "{{count}} credits" / "{{count}} tegoed"
- `credits.unlimited` — "Unlimited access" / "Onbeperkte toegang"
- `credits.expiresIn` — "{{days}} days left" / "nog {{days}} dagen"
- `credits.expired` — "Trial ended" / "Proefperiode voorbij"

**Accessibility requirements:**

- `aria-label` describing current credit state (e.g. `"47 credits remaining"`)
- Do not rely on colour alone to communicate low-credit state — pair with count text

**Cursor must not:**

- Call `useSubscription()` inside this component — receive props from parent
- Add new npm dependencies
- Change the props interface

---

### P4-CUR-02 — SubscriptionStatusBadge

**Status:** ✅ READY
**File to create:** `src/components/Payments/SubscriptionStatusBadge/index.tsx`
**Reference component:** `src/components/FoodLog/MealTypeBadge/index.tsx`

**Props** (already in `src/types/components.ts`):

```ts
type SubscriptionStatusBadgeProps = {
  status: SubscriptionStatus; // 'trial' | 'active' | 'comped' | 'expired' | 'cancelled'
};
```

**Data hook:** none — presentational only

**Design brief:**
Pill badge showing subscription status. Shape: `inline-flex items-center px-2 py-0.5 rounded-pill text-xs font-medium`.

- `trial` → `bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200`
- `active` → `bg-brand-500 text-white`
- `comped` → `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200` + star prefix icon
- `expired` → `bg-warm-200 text-warm-500 dark:bg-warm-700 dark:text-warm-400`
- `cancelled` → `bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300`

**Translation keys** (add to both locale files):

- `subscription.status.trial` — "Trial" / "Proefperiode"
- `subscription.status.active` — "Active" / "Actief"
- `subscription.status.comped` — "Beta Access" / "Betatoegang"
- `subscription.status.expired` — "Expired" / "Verlopen"
- `subscription.status.cancelled` — "Cancelled" / "Geannuleerd"

**Accessibility requirements:**

- `aria-label={t(\`subscription.status.${status}\`)}`

**Cursor must not:**

- Add new npm dependencies
- Hardcode label strings
- Change the props interface

---

### P4-CUR-03 — DiscountCodeInput

**Status:** ✅ READY
**File to create:** `src/components/Payments/DiscountCodeInput/index.tsx`
**Reference component:** `src/components/Contact/ContactForm/index.tsx`

**Props** (already in `src/types/components.ts`):

```ts
type DiscountCodeInputProps = {
  onSuccess?: (result: { granted: boolean; type: string }) => void;
};
```

**Data hooks:**

- `useApplyDiscount()` from `src/hooks/useSubscription.ts`
  Returns: `{ mutate, isPending, error, isSuccess }`

**Design brief:**
Single-field form. Use `react-hook-form` + zod schema `DiscountValidateSchema` from `@/types/api`.
Input: `font-mono uppercase text-sm tracking-wide rounded-input border border-warm-300 dark:border-warm-600 px-3 py-2 bg-white dark:bg-warm-900`.
Apply button: `bg-brand-500 text-white rounded-pill px-4 py-2 text-sm` inline to the right.

States:

- **Idle**: empty field + "Apply" button
- **Loading**: button shows spinner + disabled, input disabled
- **Success**: green check icon + `text-brand-600 text-sm` success message `subscription.discount.applied`
- **Error**: red inline message below input — use `error.message` from mutation (already contains the API error string)
- Code is auto-uppercased on input — use `toUpperCase()` transform in onChange

**Translation keys** (add to both locale files):

- `subscription.discount.placeholder` — "Discount code" / "Kortingscode"
- `subscription.discount.apply` — "Apply" / "Toepassen"
- `subscription.discount.applied` — "Code applied — access granted!" / "Code toegepast — toegang verleend!"

**Accessibility requirements:**

- Input `aria-label={t('subscription.discount.placeholder')}`
- Error message in `role="alert"` so screen readers announce it

**Cursor must not:**

- Use uncontrolled inputs — must use `react-hook-form`
- Hardcode strings
- Change the props interface

---

### P4-CUR-04 — PaywallModal

**Status:** ✅ READY
**File to create:** `src/components/Payments/PaywallModal/index.tsx`
**Reference component:** `src/components/Barcode/BarcodeScanner/index.tsx` (for modal shell)

**Props** (already in `src/types/components.ts`):

```ts
type PaywallModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'no_credits' | 'expired'; // defaults to 'no_credits'
};
```

**Data hooks:**

- `useStartCheckout()` from `src/hooks/useSubscription.ts` — returns `{ mutate, isPending }`
- `VITE_STRIPE_PUBLISHABLE_KEY` from `import.meta.env` (for display only — NOT used to init Stripe; checkout is server-side)

**Design brief:**
Centered modal with semi-transparent backdrop (`bg-black/60`). Content card: `bg-white dark:bg-warm-900 rounded-card shadow-xl max-w-md w-full p-6`.

Structure:

1. Header: lock icon + `text-xl font-semibold` title
2. Body: 2–3 lines explaining the situation based on `reason`
3. `DiscountCodeInput` embedded below the explanation
4. OR separator: `text-xs text-warm-400` "— or —"
5. Upgrade button: `bg-brand-500 text-white rounded-pill px-6 py-3 w-full text-center font-medium` — calls `useStartCheckout({ priceId: import.meta.env['VITE_STRIPE_PRICE_ID'] })` on click; shows spinner when `isPending`
6. Skip link: `text-sm text-warm-400 underline hover:text-warm-600` — calls `onClose`

**Translation keys** (add to both locale files):

- `paywall.title.no_credits` — "You've used all your free credits" / "Je hebt al je gratis tegoed gebruikt"
- `paywall.title.expired` — "Your free trial has ended" / "Je proefperiode is afgelopen"
- `paywall.body.no_credits` — "Upgrade to NutriApp Pro for unlimited food tracking and AI tips." / "Upgrade naar NutriApp Pro voor onbeperkt voedsel bijhouden en AI-tips."
- `paywall.body.expired` — "Your 30-day trial is over. Have a discount code? Enter it below." / "Je proefperiode van 30 dagen is voorbij. Heb je een kortingscode? Voer hem hieronder in."
- `paywall.upgrade` — "Upgrade to Pro" / "Upgrade naar Pro"
- `paywall.skip` — "Maybe later" / "Misschien later"

**Accessibility requirements:**

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` pointing to the title element
- Trap focus inside modal while open
- Escape key calls `onClose`

**Cursor must not:**

- Import or initialise Stripe JS directly — checkout redirect is handled by `useStartCheckout`
- Show pricing data inline (no hardcoded price strings — price is handled server-side by Stripe)
- Change the props interface

---

### P4-CUR-05 — PricingCard

**Status:** ✅ READY
**File to create:** `src/components/Payments/PricingCard/index.tsx`
**Reference component:** `src/components/Payments/PaywallModal/index.tsx` _(build P4-CUR-04 first)_

**Props** (already in `src/types/components.ts`):

```ts
type PricingCardProps = {
  subscription: SubscriptionResponse;
  priceId: string;
  priceDisplay: string; // e.g. "€4.99 / month"
};
```

**Data hooks used by parent page** (parent passes data as props — do not call hooks inside this component):

- `useSubscription()` from `src/hooks/useSubscription.ts`
- `useStartCheckout()` from `src/hooks/useSubscription.ts`

**Design brief:**
Standalone pricing card for the `/pricing` page. Card: `bg-white dark:bg-warm-900 rounded-card shadow-card border border-warm-200 dark:border-warm-700 max-w-sm mx-auto p-8 text-center`.

Structure:

1. `SubscriptionStatusBadge` (current status, top-right)
2. Plan name: `NutriApp Pro` in `text-2xl font-bold text-warm-900 dark:text-warm-100`
3. Price: `priceDisplay` in `text-4xl font-bold text-brand-600`
4. Feature list (3 bullet points, translated): unlimited credits, AI tips, barcode scanner
5. `CreditCounter` if status is `trial` — show remaining credits
6. CTA button:
   - If `subscription.status === 'active'` or `comped`: show "You're all set ✓" in `text-brand-600 font-semibold` (no button)
   - Otherwise: "Upgrade to Pro" button — `bg-brand-500 text-white rounded-pill px-6 py-3 w-full text-lg font-medium`
7. `DiscountCodeInput` below the CTA button

**Translation keys** (add to both locale files):

- `pricing.planName` — "NutriApp Pro" / "NutriApp Pro"
- `pricing.feature.unlimited` — "Unlimited food tracking" / "Onbeperkt voedsel bijhouden"
- `pricing.feature.aiTips` — "Personalised AI nutrition tips" / "Persoonlijke AI-voedingstips"
- `pricing.feature.barcode` — "Barcode scanner with 3M+ products" / "Barcodescanner met 3M+ producten"
- `pricing.alreadyActive` — "You're all set ✓" / "Je bent klaar ✓"
- `pricing.upgrade` — "Upgrade to Pro" / "Upgrade naar Pro"

**Accessibility requirements:**

- Feature list in `<ul role="list">` with `<li>` items
- CTA button: `aria-label={t('pricing.upgrade')}` when visible

**Cursor must not:**

- Call `useSubscription()` or `useStartCheckout()` inside this component — receive data from parent
- Hardcode the price string — always use `priceDisplay` prop
- Change the props interface

---

## Upcoming Phases (not yet ready)

### P5-CUR-01 — ChatbotDrawer

**Status:** 🔒 PENDING (Phase 5 — Chatbot not started)
