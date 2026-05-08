# NutriApp — Finalization Tasks

## Tier 2 — i18n: Dynamic strings in AiTipCard

These strings are hardcoded English in `src/components/AI/AiTipCard/index.tsx` inside the `derivePatternInsight()` function (lines ~82–140). They are template literals that compose sentences using live data values (counts, percentages, dates), which makes them harder to i18n — they need restructuring into `t()` calls with interpolation.

### Strings to migrate

| Location               | Hardcoded string                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `derivePatternInsight` | `"Your food quality dial is in the red — most logged meals are highly processed. Swapping refined grains for whole-grain alternatives (oats, brown rice, lentils) would close your ${fiberGap} g fiber gap..."` |
| `derivePatternInsight` | `"Your food quality dial is in the red — most logged meals are highly processed. Prioritise whole-food swaps..."`                                                                                               |
| `derivePatternInsight` | `"Your processed food intake spikes on weekends — ${weekendHighDays.length} of your last ${total} weekend days were high-processing days..."`                                                                   |
| `derivePatternInsight` | `"Fiber tends to be low on high-processing days. On your ${minimalDays} whole-food day(s)..."`                                                                                                                  |
| `derivePatternInsight` | `"${wholePct}% of your logged meals are whole or minimally processed. Nudging that above 80%..."`                                                                                                               |
| `derivePatternInsight` | `"${minimalDays} of your last ${total} logged days were whole-food days — that's a strong base. Keep the streak going."`                                                                                        |

### How to approach

Each string becomes a `t()` key with named interpolation variables, e.g.:

```ts
t('tipCard.insight.weekendSpike', { days: weekendHighDays.length, total });
```

Add both EN and NL versions to the translation files.

### Also in AiTipCard — Plant diversity modal (lines ~381–554)

The "Why 30 Plants?" modal has fully hardcoded English content:

- Modal title and explanation text
- Category labels: "Vegetables", "Fruits", "Whole Grains", "Nuts & Seeds", "Legumes", "Herbs & Spices"
- Example foods per category
- Point rules: "1 pt each", "¼ pt each (1 pt if fresh)"
- Tips: "Buy mixed frozen berries...", "Try the Rainbow Rule...", "Swap white rice for a 7-grain blend..."
- "Rolling 7-day window" info box

These are static strings so they can be moved to i18n keys straightforwardly — just verbose.

---

## Tier 3 — Low priority / acceptable until launch

### Terms & Privacy pages

`src/pages/Terms.tsx` and `src/pages/Privacy.tsx` contain full legal text hardcoded in English. These are pending legal review before public launch anyway. When finalized, either:

- Add a Dutch translation as a separate page/section
- Or accept English-only for legal text (common practice)

### Zod validation messages

`src/pages/SignUp.tsx` and `src/pages/ForgotPassword.tsx` have schema validation messages like `'Required'`, `'At least 8 characters'`, `'Passwords do not match'` hardcoded in English. These show on form errors.

Fix: move to `t()` calls using existing keys (`common.required`, `auth.error.weakPassword`, `auth.error.passwordMismatch`).

### PWAInstallPrompt

`src/components/UI/PWAInstallPrompt/index.tsx` uses its own internal `COPY` object with EN/NL strings rather than going through i18n. It works correctly (shows Dutch when in Dutch mode) but is inconsistent with the rest of the app. Low risk.

Fix: replace the internal COPY object with `useTranslation` and move strings to the translation files.

---

## Other pre-launch items (non-i18n)

### Admin dashboard ✓

Built at `/admin` — shows all users with signup date, last login, subscription status, food log count, API call count, and inline credit adjustment for free/trial users. Protected by `VITE_ADMIN_USER_ID` (client) and `ADMIN_USER_ID` (server).

### Terms & Privacy legal review

Both pages show a "pending legal review" notice. These need to be replaced with actual content before public launch.

### Stripe price IDs (yearly)

`STRIPE_PRICE_ID_YEARLY` is configured but no yearly plan UI exists yet. Either wire it up or remove the env var to avoid confusion.
