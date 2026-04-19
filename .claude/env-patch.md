# NutriApp — Environment Variable Patch

> This file patches `.env.example` and clarifies two variables that were
> missing or ambiguous in the previous handover. Apply these additions
> to your `.env.local` and update `.env.example` accordingly.

---

## Gap 1 Fix — `SUPABASE_SERVICE_ROLE_KEY` (confirmed intentional)

### Why `SERVICE_ROLE_KEY` and not `ANON_KEY` server-side?

The auth middleware in `src/api/middleware/auth.ts` calls:

```ts
supabase.auth.getUser(token)
```

This verifies the user's JWT token passed in the `Authorization` header.
To verify a JWT server-side reliably, you must initialise Supabase with the
`SERVICE_ROLE_KEY` — the `ANON_KEY` cannot verify arbitrary user tokens
on the server. This is the correct and intended pattern.

The `SERVICE_ROLE_KEY` in this context is only used to verify the
incoming JWT — it does not bypass any access control because all database
queries go directly to Neon (not through Supabase Postgres). There is no
RLS to bypass.

### Add to `.env.example` and `.env.local`:

```env
# === SUPABASE ===
VITE_SUPABASE_URL=                    # client bundle (safe)
VITE_SUPABASE_ANON_KEY=              # client bundle (safe — scoped to Auth only)
SUPABASE_SERVICE_ROLE_KEY=           # server only — Hono auth middleware JWT verification
                                     # NEVER in client bundle or VITE_ prefix
```

### Complete auth middleware with correct key:

```ts
// src/api/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  // SERVICE_ROLE_KEY used here for server-side JWT verification only.
  // This client only calls supabase.auth.getUser() — it never queries
  // Supabase Postgres or bypasses any database access control.
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← correct for server-side token verify
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

  c.set('user', user);
  await next();
});
```

### Why not `SUPABASE_ANON_KEY` server-side?

Using `ANON_KEY` server-side to verify a user's token can produce
inconsistent results depending on Supabase's RLS policies and is not
the documented server-side pattern. `SERVICE_ROLE_KEY` for JWT
verification is explicitly recommended in Supabase's server-side docs.

---

## Gap 3 Fix — Design Tokens

### Decision: Warm off-white base, deep forest green primary, amber accent.

The palette is intentionally health-forward without being clinical.
Think farmers market, not hospital. Warm and grounded.

### Add to `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',  // toggled by adding 'dark' class to <html>
  theme: {
    extend: {
      colors: {
        // Brand greens — primary actions, active states, success
        brand: {
          50:  '#f0faf4',
          100: '#dcf4e6',
          200: '#bbe8cf',
          300: '#8dd5ae',
          400: '#57ba86',
          500: '#339e68',  // ← primary brand green
          600: '#237f52',
          700: '#1c6642',
          800: '#185135',
          900: '#14432c',
          950: '#0a2519',
        },
        // Amber — accent, warnings, highlights
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',  // ← accent amber
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Warm neutrals — backgrounds, surfaces, text
        // Slightly warm (not pure gray) to complement the green/amber palette
        warm: {
          50:  '#fafaf8',  // ← light mode page background
          100: '#f4f4f0',  // ← light mode card background
          200: '#e8e8e2',  // ← light mode border
          300: '#d4d4cc',
          400: '#a8a89e',
          500: '#78786e',
          600: '#5a5a52',
          700: '#3e3e38',  // ← dark mode text secondary
          800: '#28281f',  // ← dark mode card background
          900: '#1a1a14',  // ← dark mode page background
          950: '#0f0f0a',
        },
      },
      fontFamily: {
        // Display: headings, feature text, marketing copy
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // Body: UI text, labels, descriptions
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
        // Mono: nutrient numbers, data, credit counts, confidence scores
        mono:    ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Extend with tighter leading for display use
        'display-xl': ['3rem',    { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'display-md': ['1.875rem',{ lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        // Slightly softer than Tailwind defaults — friendlier feel
        'card': '1rem',    // food log cards, tip cards
        'pill': '9999px',  // badges, toggles, chips
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
        'card-dark':  '0 1px 3px 0 rgb(0 0 0 / 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
```

### CSS variables for light/dark mode (add to `src/index.css`):

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Surfaces */
    --color-bg:           #fafaf8;   /* warm.50  */
    --color-surface:      #f4f4f0;   /* warm.100 */
    --color-border:       #e8e8e2;   /* warm.200 */

    /* Text */
    --color-text-primary:   #1a1a14; /* warm.900 */
    --color-text-secondary: #5a5a52; /* warm.600 */
    --color-text-muted:     #a8a89e; /* warm.400 */

    /* Brand */
    --color-brand:          #339e68; /* brand.500 */
    --color-brand-light:    #f0faf4; /* brand.50  */
    --color-brand-dark:     #1c6642; /* brand.700 */

    /* Accent */
    --color-accent:         #fbbf24; /* amber.400 */
    --color-accent-light:   #fffbeb; /* amber.50  */

    /* Semantic */
    --color-success:        #339e68;
    --color-warning:        #f59e0b;
    --color-error:          #ef4444;
    --color-info:           #3b82f6;

    /* Meal type colours */
    --color-breakfast:      #f59e0b; /* amber */
    --color-lunch:          #339e68; /* brand green */
    --color-dinner:         #3b82f6; /* blue */
    --color-snack:          #8b5cf6; /* purple */
    --color-drink:          #06b6d4; /* cyan */
  }

  .dark {
    --color-bg:           #1a1a14;   /* warm.900 */
    --color-surface:      #28281f;   /* warm.800 */
    --color-border:       #3e3e38;   /* warm.700 */

    --color-text-primary:   #fafaf8; /* warm.50  */
    --color-text-secondary: #d4d4cc; /* warm.300 */
    --color-text-muted:     #78786e; /* warm.500 */

    --color-brand:          #57ba86; /* brand.400 — slightly lighter in dark */
    --color-brand-light:    #0a2519; /* brand.950 */
    --color-brand-dark:     #8dd5ae; /* brand.300 */

    --color-accent:         #fcd34d; /* amber.300 — brighter in dark */
    --color-accent-light:   #1a1200;
  }

  html {
    font-family: 'DM Sans', system-ui, sans-serif;
    background-color: var(--color-bg);
    color: var(--color-text-primary);
  }

  h1, h2, h3, h4 {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  }

  /* Nutrient numbers, credit counts, confidence scores */
  .font-data {
    font-family: 'DM Mono', ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
}
```

### Usage patterns for Claude Code and Cursor:

```tsx
// Page background
<div className="min-h-screen bg-[var(--color-bg)]">

// Card surface
<div className="bg-[var(--color-surface)] border border-[var(--color-border)]
                rounded-card shadow-card dark:shadow-card-dark">

// Primary brand button
<button className="bg-brand-500 hover:bg-brand-600 text-white
                   dark:bg-brand-400 dark:hover:bg-brand-300
                   rounded-pill px-4 py-2 font-body font-medium
                   transition-colors duration-150">

// Meal type badge — use the CSS variables
<span style={{ backgroundColor: `var(--color-${entry.mealType})` }}
      className="text-white text-xs font-medium rounded-pill px-2 py-0.5">

// Nutrient number
<span className="font-data text-sm text-[var(--color-text-secondary)]">
  {calories} kcal
</span>

// Credit counter — amber warning states
<span className={cn(
  'font-data text-sm',
  credits > 10 ? 'text-[var(--color-text-secondary)]' :
  credits > 5  ? 'text-amber-500 dark:text-amber-400' :
                 'text-red-500 dark:text-red-400'
)}>
  {credits} credits
</span>
```

### Confidence indicator colours (maps to existing confidence levels):

```ts
// src/utils/confidence.ts
export function confidenceColour(score: number) {
  if (score >= 0.7) return 'text-brand-500 dark:text-brand-400';   // green — high
  if (score >= 0.4) return 'text-amber-500 dark:text-amber-400';   // amber — medium
  return 'text-warm-400 dark:text-warm-500';                        // grey  — low
}
```

### Font loading note:

Google Fonts URL above loads three weights of DM Sans, DM Mono, and
Plus Jakarta Sans. This is sufficient for the design system.
In production, self-host the fonts via `@fontsource` packages to avoid
the external network request and improve privacy:

```bash
npm install @fontsource/plus-jakarta-sans @fontsource/dm-sans @fontsource/dm-mono
```

```ts
// src/main.tsx
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
```

---

## Complete Updated `.env.example` additions

Add these lines to your existing `.env.example` (they were missing):

```env
# Already present — confirmed correct key for server-side JWT verification:
SUPABASE_SERVICE_ROLE_KEY=           # Hono auth middleware only — never client

# New — required for Stripe checkout route:
STRIPE_PRICE_ID=price_live_xxx       # live mode — create in Stripe dashboard
STRIPE_PRICE_ID_TEST=price_test_xxx  # test mode — separate price in Stripe test mode
```
