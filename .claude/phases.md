# NutriApp — Build Phases

> Claude Code: read this at the start of every session.
> Never start a new phase until the current phase test gate is fully green.
> Update the status checkboxes as tasks are completed.

---

## Phase Status Overview

| Phase | Name                 | Status                                                                          |
| ----- | -------------------- | ------------------------------------------------------------------------------- |
| 1     | Foundation           | ✅ Complete (unit gate ✓ — integration/e2e/manual pending env setup)            |
| 2     | AI Integration       | ✅ Complete (unit gate ✓, integration gate ✓ — e2e pending)                     |
| 3     | Barcode + Product DB | ✅ Complete (unit gate ✓, integration gate ✓ — e2e pending)                     |
| 4     | Payments + Credits   | ✅ Complete (unit gate ✓, integration gate ✓, e2e gate ✓ — manual pending)      |
| 5     | Chatbot + FAQ        | 🔨 In Progress (backend ✓, unit gate ✓, integration gate ✓ — UI pending Cursor) |
| 6     | SEO + A11y + Polish  | ⏳ Pending                                                                      |

---

## Phase 1 — Foundation

**Goal:** Working app shell with auth, database, basic food log (text only),
i18n, theme switching, contact form. No AI yet. No payments yet.

### Claude Code Tasks

- [ ] Scaffold Vite + React + TypeScript project with strict tsconfig
- [ ] Configure Tailwind CSS with design tokens (light + dark CSS vars)
- [ ] Configure ESLint (jsx-a11y + @typescript-eslint) + Prettier
- [ ] Configure Husky + lint-staged pre-commit hooks
- [ ] Set up Vitest + Playwright + testing utilities
- [ ] Set up GitHub Actions CI (lint → typecheck → unit → integration → e2e)
- [ ] Configure Workbox PWA (manifest, service worker, offline fallback page)
- [ ] Write Drizzle schema (`src/lib/db/schema.ts`) — all tables
- [ ] Run `drizzle-kit generate` + `drizzle-kit migrate` on dev Neon branch
- [ ] Write Neon DB client (`src/lib/db/client.ts`)
- [ ] Configure Better Auth server + client (`src/lib/auth/server.ts`, `src/lib/auth/client.ts`)
- [ ] Write Hono app root (`src/api/index.ts`) with middleware stack
- [ ] Mount Better Auth handler (`/auth/**`) in Hono; user provisioning via `databaseHooks`
- [ ] Set up i18next with EN + NL locales scaffold
- [ ] Write Zustand stores: `src/store/uiStore.ts`, `src/store/authStore.ts`
- [ ] Write base layout shell (nav placeholder, outlet, theme provider)
- [ ] Write auth pages: sign-up, sign-in, forgot password, email confirm
- [ ] Write food log entry form (text description + meal type — no AI parse yet)
- [ ] Write food log list/daily view (manual entries only in Phase 1)
- [ ] Write `/terms` static page (EN + NL)
- [ ] Write `/privacy` static page (EN + NL)
- [ ] Configure Resend + write `POST /api/contact` endpoint
- [ ] Write contact page with form

### Cursor Tasks [CURSOR] — mark READY only after Claude Code finishes layout shell

- [ ] Navigation bar + bottom tab bar (mobile/desktop)
- [ ] Food log entry card component
- [ ] Daily summary view layout
- [ ] Theme toggle animation
- [ ] Language toggle component

### ⚠️ Human Actions Required Before Phase 1

```
1. Create Neon project at https://neon.tech
   → EU Frankfurt region
   → Create branches: main / staging / dev
   → Add DATABASE_URL + DATABASE_URL_UNPOOLED to .env.local

2. Generate Better Auth secret:
   Run: openssl rand -hex 32
   Add to .env.local as BETTER_AUTH_SECRET

3. Create Resend account at https://resend.com
   → Verify sending domain
   → Add RESEND_API_KEY + RESEND_FROM_EMAIL

4. Create Upstash Redis at https://console.upstash.com
   → EU region
   → Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

5. Generate IP_HASH_SECRET:
   Run: openssl rand -hex 32
   Add to .env.local

6. Run: npx drizzle-kit migrate
   (applies schema to dev Neon branch)
```

### Phase 1 Test Gate

All of the following must pass before Phase 2 begins.

**Vitest — unit:**

- [ ] `sanitiseText` strips HTML and truncates to 2000 chars
- [ ] `sanitiseForPrompt` wraps input in `<user_input>` delimiters
- [ ] Discount code validation: valid / expired / zero-uses logic
- [ ] Credit deduction returns false when insufficient
- [ ] i18n completeness: all EN keys have NL equivalents (no `[TODO-NL]`)
- [ ] `store/uiStore`: theme and language persist across mock reloads

**Vitest — integration (dev Neon branch):**

- [ ] POST `/api/auth/on-signup` creates `user_profiles` row
- [ ] POST `/api/auth/on-signup` creates `user_credits` row (50 credits)
- [ ] POST `/api/auth/on-signup` is idempotent (safe to call twice)
- [ ] User A cannot read User B's `food_log_entries` (app-layer access control)
- [ ] Food log entry INSERT returns the new row with correct `userId`
- [ ] Contact form endpoint sends via Resend (mock Resend in test)
- [ ] Rate limiter returns 429 after threshold (use Upstash mock)

**Playwright — e2e:**

- [ ] User signs up → on-signup endpoint fires → lands on dashboard
- [ ] User adds a food log entry (text) → appears in daily view
- [ ] Language toggle switches all visible UI strings to NL
- [ ] Theme toggle switches to dark mode, persists on reload
- [ ] `/terms` and `/privacy` load in EN and NL
- [ ] Contact form submits and shows success state

**Manual checks:**

- [ ] PWA installs on mobile (iOS Safari + Android Chrome)
- [ ] App loads from cache after first visit (service worker active)
- [ ] All interactive elements keyboard-reachable (Tab key navigation)
- [ ] axe-core: zero violations on all Phase 1 pages

---

## Phase 2 — AI Integration

**Goal:** Natural language food parsing, rolling tip engine,
AI client abstraction (Gemini dev / Claude prod).

### Claude Code Tasks

- [ ] Write `src/lib/ai/client.ts` unified AI abstraction
- [ ] Write Gemini adapter (called from Hono API routes)
- [ ] Write Anthropic adapter (prod only)
- [ ] Write `POST /api/ai/parse-food` route:
  - Accepts: `{ description, language, userId }`
  - Sanitises input before prompt
  - Deducts 1 credit (atomic transaction) before calling AI
  - Returns structured nutrients JSON + confidence score
  - Rate limited: 10/min per userId
- [ ] Integrate food parser into food log entry form
- [ ] Add confidence indicator to food log entries
- [ ] Add Drizzle migration: `parsed_nutrients` JSONB + `confidence` columns
- [ ] Write `POST /api/ai/generate-tips` route:
  - Only fires after 3+ days of data
  - References foods the user has already logged
  - Returns structured tip JSON
  - Deducts 2 credits (atomic)
  - Generates tip in both EN and NL in one request cycle
- [ ] Write tip display query hook
- [ ] Write weekly tip email template (Resend)

### Cursor Tasks [CURSOR]

- [ ] Tip card component (with dismiss animation)
- [ ] Confidence indicator badge component
- [ ] AI parsing loading state animation
- [ ] Nutrient mini-chart (pure CSS bars)

### ⚠️ Human Actions Required Before Phase 2

```
Add GEMINI_API_KEY to .env.local
→ https://aistudio.google.com/app/apikey
```

### Phase 2 Test Gate

**Vitest — unit:**

- [ ] AI client routes to Gemini in `NODE_ENV=development`
- [ ] AI client routes to Anthropic in `NODE_ENV=production` (mocked)
- [ ] Prompt builder includes language instruction as first line
- [ ] Prompt builder wraps user input in `<user_input>` delimiters
- [ ] Tip engine: returns null/empty with fewer than 3 days of data
- [ ] Credit deduction called BEFORE AI call (not after)
- [ ] Concurrent credit deduction does not overdraft (transaction lock test)

**Vitest — integration:**

- [ ] `POST /api/ai/parse-food` returns valid nutrients JSON shape
- [ ] `POST /api/ai/parse-food` rejects prompt injection attempt
- [ ] `POST /api/ai/parse-food` returns 429 at rate limit
- [ ] `POST /api/ai/parse-food` returns 402 when credits exhausted
- [ ] Tips stored with both `tip_text_en` and `tip_text_nl` populated

**Playwright — e2e:**

- [ ] User logs "eggs and toast for breakfast" → parsed nutrients shown
- [ ] Confidence badge visible on parsed entry
- [ ] After 3+ days of seeded entries: tip appears on dashboard
- [ ] Tip dismisses and does not reappear

---

## Phase 3 — Barcode + Product Database

**Goal:** Optional barcode scanning, Open Food Facts + USDA integration,
local product registry, AI fallback for unknown products.

### Claude Code Tasks

- [ ] Add Drizzle migration: `products` table (full schema)
- [ ] Write `GET /api/products/barcode/:barcode` route:
  - Query Open Food Facts API (cache 7 days in Upstash)
  - Fallback to USDA FoodData Central
  - Fallback to AI estimate (Gemini, confidence < 0.5)
  - Rate limited: 30/min per userId
- [ ] Write `POST /api/products` route (user registers a product)
- [ ] Integrate ZXing barcode scanner as optional camera component
- [ ] Write processing level assessment logic (1–4 scale)
- [ ] Link scanned product to food log entry via `productId` FK

### Cursor Tasks [CURSOR]

- [ ] Barcode scanner UI overlay (camera + scan line animation)
- [ ] Product card component (name, brand, nutrients, source badge)
- [ ] Processing level indicator (4-step colour scale)
- [ ] Product registration confirmation modal

### Phase 3 Test Gate

**Vitest — unit:**

- [ ] Barcode lookup: Open Food Facts hit → returns product
- [ ] Barcode lookup: cache hit → skips external API call
- [ ] Barcode lookup: unknown barcode → AI estimate with confidence < 0.5
- [ ] AI estimated product has `source = 'ai_estimated'`
- [ ] Processing level logic returns correct integer for known inputs

**Vitest — integration:**

- [ ] `GET /api/products/barcode/:barcode` returns 429 at rate limit
- [ ] `POST /api/products` creates row with `createdBy = userId`
- [ ] User B can read a product created by User A (public read)

**Playwright — e2e:**

- [ ] Scanner modal opens + closes correctly
- [ ] Mock barcode returns product card
- [ ] User confirms product → entry added to food log
- [ ] Unknown barcode shows AI estimate with low-confidence badge

---

## Phase 4 — Payments, Credits + Discount Codes

**Goal:** Stripe Checkout, free credit trial, discount code bypass,
subscription management.

### Claude Code Tasks

- [ ] Add Drizzle migration: `subscriptions` table + `discount_codes` table
- [ ] Seed discount codes (`neon/seed.sql` — run after migration)
- [ ] Write `POST /api/stripe/checkout` route
- [ ] Write `POST /api/stripe/webhook` route (Stripe signature verified)
- [ ] Write `POST /api/discount/validate` route (atomic validate + grant)
- [ ] Write credit expiry check middleware (runs on every authenticated request)
- [ ] Write subscription status check (used by paywall middleware)
- [ ] Write pricing page data route (returns current Stripe price)

### Cursor Tasks [CURSOR]

- [ ] Pricing page layout
- [ ] Credit counter component (nav)
- [ ] Paywall modal (soft wall)
- [ ] Discount code input component
- [ ] Subscription status badge

### ⚠️ Human Actions Required Before Phase 4

```
1. Create Stripe account → https://dashboard.stripe.com
   → Create product "NutriApp Pro" with monthly price
   → Copy price ID (price_xxx) → add to .env.local as STRIPE_PRICE_ID
   → Add STRIPE_SECRET_KEY + VITE_STRIPE_PUBLISHABLE_KEY (TEST keys)

2. Set up Stripe webhook:
   Run: stripe listen --forward-to localhost:3000/api/stripe/webhook
   Add STRIPE_WEBHOOK_SECRET to .env.local

3. Run Neon migration for subscriptions + discount_codes tables

4. Run seed script to insert dev discount codes
```

### Phase 4 Test Gate

**Vitest — unit:**

- [ ] Valid beta code grants `comped` subscription, skips Stripe
- [ ] Expired code rejected with correct error message
- [ ] Zero-uses code rejected
- [ ] Influencer code decrements `uses_remaining` atomically
- [ ] Paywall check: trial user with credits → allowed
- [ ] Paywall check: expired trial → blocked

**Vitest — integration:**

- [ ] `POST /api/discount/validate`: valid code creates subscription row
- [ ] `POST /api/discount/validate`: invalid code returns 400
- [ ] `POST /api/stripe/webhook`: payment event grants active subscription
- [ ] Expired credits block AI operations (402 returned)

**Playwright — e2e:**

- [ ] New user has 50 credits after signup
- [ ] After credits exhausted: paywall modal appears
- [ ] Valid discount code → access granted, Stripe bypassed
- [ ] Invalid code → error shown inline
- [ ] Stripe Checkout opens (test mode) → completes → subscription active

---

## Phase 5 — Chatbot + FAQ

**Goal:** FAQ-first chatbot, Gemini fallback, rate limiting,
anonymous session management.

### Claude Code Tasks

- [ ] Create `public/faq/faq.json` (bilingual, already exists — review + expand)
- [ ] Write Fuse.js FAQ matcher utility (`src/utils/faqMatcher.ts`)
- [ ] Write `POST /api/chat` route:
  - Always uses Gemini (never Claude)
  - Fuse.js FAQ match first (threshold 0.75)
  - Falls back to Gemini only if no match
  - Rate limited: 5/day anon (by ipHash), 20/day authenticated
  - Logs unanswered questions to `unanswered_questions` table
- [ ] Add Drizzle migration: `chatbot_sessions` + `unanswered_questions` tables
- [ ] Write anonymous IP session tracking (no auth required for chatbot)
- [ ] Write "How to Use" content in both locale files

### Cursor Tasks [CURSOR]

- [ ] Chatbot sliding drawer (mobile-first)
- [ ] Chat message bubbles (user vs bot)
- [ ] Streaming text animation
- [ ] FAQ suggestion chips
- [ ] "How to Use" modal with step illustrations
- [ ] Rate limit reached state UI

### Phase 5 Test Gate

**Vitest — unit:**

- [ ] Fuse.js matcher: known question → returns correct FAQ answer
- [ ] Fuse.js matcher: unrelated question → null (triggers AI fallback)
- [ ] 6th chatbot message from same IP hash → 429
- [ ] Chatbot response language follows `user.language`
- [ ] Unanswered question logged to DB

**Playwright — e2e:**

- [ ] Chatbot opens → shows greeting + FAQ chips
- [ ] Known FAQ question answered without AI call (verify via response speed/log)
- [ ] Unknown question gets Gemini response
- [ ] After 5 anon messages: rate limit message shown, input disabled
- [ ] "How to Use" modal opens, navigates steps, closes with Escape

---

## Phase 6 — SEO, Accessibility + Polish

**Goal:** Production-ready. Public pages prerendered, full a11y audit
passed, Lighthouse ≥ 90 across the board.

### Claude Code Tasks

- [ ] React Helmet Async meta tags on all routes
- [ ] Sitemap generator (build-time, all public routes)
- [ ] `robots.txt` (exclude auth routes + API)
- [ ] JSON-LD structured data (SoftwareApplication on home)
- [ ] Prerender public pages (home, pricing, terms, privacy, contact)
- [ ] Code-split: lazy load barcode scanner + all route-level pages
- [ ] Image optimisation (WebP, explicit dimensions, lazy loading)
- [ ] `vercel.json` security headers (CSP, X-Frame-Options, etc.)
- [ ] Full axe-core automated a11y test suite
- [ ] Lighthouse CI configuration (target ≥ 90 perf, 100 a11y, 100 SEO)

### Cursor Tasks [CURSOR]

- [ ] Skeleton loader components (per card type)
- [ ] Error boundary fallback UI
- [ ] Empty state SVG illustrations
- [ ] Onboarding flow (first-time user)
- [ ] PWA install prompt component

### Phase 6 Test Gate

**Automated:**

- [ ] Lighthouse CI: Performance ≥ 90, Accessibility = 100, SEO = 100 (all public pages)
- [ ] axe-core: zero violations across all pages
- [ ] All Playwright e2e tests still passing

**Manual:**

- [ ] Screen reader (NVDA or VoiceOver) through full signup → log food flow
- [ ] Keyboard-only navigation through full user journey
- [ ] PWA install tested on iOS Safari + Android Chrome
- [ ] Dutch copy reviewed by a fluent speaker
- [ ] T&C and Privacy reviewed by a lawyer before public launch

**Production deploy checklist:**

- [ ] All env vars set in Vercel production environment
- [ ] Neon `main` branch connection string in Vercel as `DATABASE_URL_PROD`
- [ ] Neon EU region confirmed (Frankfurt) for `DATABASE_URL_PROD`
- [ ] `ANTHROPIC_API_KEY` added (prod AI active)
- [ ] Stripe webhook updated to production URL
- [ ] Stripe keys switched from test to live
- [ ] Resend sending domain verified

---

## Post-Launch

- Monitor `unanswered_questions` table weekly → update `faq.json`
- Set up Neon automated backups (daily)
- Set up error monitoring (Sentry)
- Set up uptime monitoring (Better Uptime or similar)
- Review and rotate `IP_HASH_SECRET` every 6 months
