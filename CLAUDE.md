# NutriApp — Claude Code Master Context

> **Read this file first at the start of every session.**
> Then read `.claude/phases.md` to confirm the current phase.
> Then read `.claude/skills.md` before writing any code.
> For UI tasks ready for Cursor, see `.cursor/cursor-tasks.md`.

---

## Project Overview

NutriApp is a Progressive Web App (PWA) for flexible nutrition tracking.
Users log what they eat — in as much or as little detail as they choose —
and the app tracks consumption over time, generating personalised AI tips.
An optional barcode scanner connects to product databases for precision.

**Core philosophy:** The user decides how much input to give. The app adapts.
More input = more accurate feedback. Less input = still useful, never punishing.

---

## Tech Stack

### Frontend

- React 18 + Vite + TypeScript (strict mode — no `any`)
- Tailwind CSS (utility classes only)
- Workbox (PWA / service worker / offline)
- i18next + react-i18next (EN + NL — full coverage including AI responses)
- TanStack Query v5 (React Query) — all server state, no raw useEffect
- Zustand — global UI state only (theme, language)
- **better-auth** — Neon Auth client: `createAuthClient()`, `authClient.useSession()`
- react-hook-form + zod — all forms, always paired
- Fuse.js — FAQ fuzzy matching for chatbot
- @zxing/browser — barcode scanning via device camera
- Dexie.js — IndexedDB for offline-first food log queue
- React Helmet Async — per-route SEO meta tags

### Database

- **Neon** (serverless Postgres) — primary database
- **Drizzle ORM** — type-safe queries, schema, migrations
- **Drizzle Kit** — migration CLI (`generate`, `migrate`, `studio`)
- Neon branching: separate branches for `main`, `dev`, `staging`
- Connection via Neon HTTP driver (serverless-compatible)
- Drizzle schema (`src/lib/db/schema.ts`) is the single source of truth
  for all TypeScript DB types — never hand-write DB types

### Backend / API

- **Hono** — lightweight API framework on Vercel Edge Functions
- All API routes under `src/api/` (file-based, Hono router)
- Zod validation on every request body and response
- **Auth:** Better Auth (Neon-native — sessions stored in Neon Postgres)
  - `better-auth/react` on the frontend: `createAuthClient()`, `authClient.useSession()`
  - Session cookie validation on Hono middleware via `auth.api.getSession()`
  - All fetches use `credentials: 'include'` — no Authorization header
- **Upstash Redis** — rate limiting (sliding window) + response caching

### AI

- **Development:** Google Gemini 1.5 Flash (free tier)
- **Production:** Anthropic Claude API
- **Chatbot (always, both environments):** Gemini 1.5 Flash only
- All AI calls routed through `src/lib/ai/client.ts` exclusively
- Never import Gemini or Anthropic SDK outside of that file

### External Services

- Open Food Facts API — barcode product lookup (3M+ products)
- USDA FoodData Central API — raw ingredient nutrition data
- Stripe Checkout (hosted page) — payments, EU SCA compliant
- Resend — transactional email (welcome, tips digest, contact form)
- Upstash Redis — rate limiting buckets + 7-day product cache

### Testing

- Vitest — unit tests + integration tests
- Playwright — end-to-end tests
- Neon DB branching — isolated database per test environment

### Tooling

- ESLint + jsx-a11y + @typescript-eslint + Prettier
- Husky + lint-staged (pre-commit enforcement)
- GitHub Actions — CI/CD pipeline
- Vercel — hosting + preview deployments on every PR

---

## Repository Structure

```
nutriapp/
├── CLAUDE.md                    ← this file
├── .claude/
│   ├── agents.md                ← agentic behaviour rules
│   ├── skills.md                ← coding conventions + anti-patterns
│   └── phases.md                ← phased build plan with test gates
├── .cursor/
│   └── cursor-tasks.md          ← UI tasks for Cursor/Opus handover
├── docs/
│   ├── architecture.md          ← DB schema, API surface, data shapes
│   ├── security.md              ← auth, sanitisation, rate limits, GDPR
│   └── i18n.md                  ← EN/NL patterns + AI prompt templates
├── public/
│   ├── locales/
│   │   ├── en/common.json
│   │   └── nl/common.json
│   └── faq/faq.json             ← bilingual chatbot FAQ
├── src/
│   ├── api/                     ← Hono route handlers (server-side)
│   │   ├── ai/
│   │   │   ├── parse-food.ts
│   │   │   ├── generate-tips.ts
│   │   │   └── chat.ts
│   │   ├── barcode/
│   │   │   └── lookup.ts
│   │   ├── payments/
│   │   │   ├── checkout.ts
│   │   │   ├── webhook.ts
│   │   │   └── discount.ts
│   │   ├── contact/
│   │   │   └── send.ts
│   │   └── _middleware/
│   │       ├── auth.ts          ← JWT validation
│   │       ├── ratelimit.ts     ← Upstash sliding window
│   │       └── sanitise.ts      ← input sanitisation
│   ├── components/              ← UI components (Cursor builds these)
│   ├── pages/                   ← route-level page components
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts        ← unified AI client (Gemini/Claude)
│   │   │   └── prompts.ts       ← all prompt builders
│   │   ├── db/
│   │   │   ├── schema.ts        ← Drizzle schema (source of truth)
│   │   │   └── client.ts        ← Neon + Drizzle instance
│   │   └── redis/
│   │       └── client.ts        ← Upstash client + rate limit configs
│   ├── hooks/                   ← React Query hooks only
│   ├── stores/                  ← Zustand stores
│   ├── types/                   ← shared TypeScript types
│   └── utils/                   ← pure utility functions
├── drizzle/
│   └── migrations/              ← generated SQL migration files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
└── .github/workflows/ci.yml
```

---

## Environment Variables

### ⚠️ HUMAN ACTION REQUIRED

Before development can begin, keys must be added to `.env.local`.
Claude Code will output a `⚠️ HUMAN INPUT NEEDED` block and stop
whenever a required key is missing.

```env
# NEON DATABASE
# Create project: https://neon.tech → Connection Details
# Create branches: main, dev, staging (in Neon dashboard)
DATABASE_URL=            # pooled connection (runtime)
DATABASE_URL_DEV=        # dev branch pooled connection
DATABASE_URL_UNPOOLED=   # direct connection (migrations only)

# BETTER AUTH (Neon Auth — self-hosted, sessions stored in Neon DB)
# Generate: openssl rand -hex 32
BETTER_AUTH_SECRET=      # random 32-byte hex secret (server only)
BETTER_AUTH_URL=http://localhost:5173  # app base URL (used for redirects)

# AI — DEV (free)
# Get key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=          # server-side only

# AI — PROD
# Get key: https://console.anthropic.com → API Keys
ANTHROPIC_API_KEY=       # server-side only

# UPSTASH REDIS (EU region)
# Create DB: https://console.upstash.com
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# STRIPE — use TEST keys for dev
# Dashboard: https://dashboard.stripe.com
STRIPE_SECRET_KEY=               # server-side only
STRIPE_WEBHOOK_SECRET=           # from `stripe listen` CLI
VITE_STRIPE_PUBLISHABLE_KEY=     # safe for client

# RESEND
# Create account: https://resend.com → verify domain first
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# SECURITY
# Generate: openssl rand -hex 32
IP_HASH_SECRET=          # for GDPR-compliant IP hashing

# APP
VITE_APP_URL=http://localhost:5173
NODE_ENV=development
```

---

## Neon + Drizzle Patterns

```ts
// src/lib/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

```ts
// src/lib/db/schema.ts — always derive types from schema
import { pgTable, uuid, text, timestamp, integer, real, jsonb } from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';

export const foodLogEntries = pgTable('food_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  mealType: text('meal_type'),
  date: text('date').notNull(),
  parsedNutrients: jsonb('parsed_nutrients'),
  confidence: real('confidence'),
  source: text('source').notNull().default('manual'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Zod schemas derived from Drizzle — used in API route validation
export const selectFoodLogSchema = createSelectSchema(foodLogEntries);
export const insertFoodLogSchema = createInsertSchema(foodLogEntries);
export type FoodLogEntry = typeof foodLogEntries.$inferSelect;
export type NewFoodLogEntry = typeof foodLogEntries.$inferInsert;
```

```bash
# Migration workflow
npx drizzle-kit generate   # generate SQL from schema changes
npx drizzle-kit migrate    # apply to DATABASE_URL_UNPOOLED
npx drizzle-kit studio     # visual DB browser at localhost:4983
```

---

## Claude Code ↔ Cursor Handover Protocol

Claude Code handles backend, infrastructure, and pattern-setting.
Cursor (using Opus model) handles complex UI component work.

### Claude Code owns:

- All `src/api/` route handlers
- Database schema + Drizzle migrations
- AI client abstraction (`src/lib/ai/`)
- Auth + rate limit middleware
- Security (sanitisation, RLS-equivalent query scoping)
- Test suite (Vitest + Playwright)
- CI/CD (`ci.yml`)
- 1-2 reference components per phase to establish patterns
- Keeping `.cursor/cursor-tasks.md` up to date

### Cursor (Opus) owns:

- All components in `.cursor/cursor-tasks.md` with status `[READY]`
- Complex animations, transitions, responsive layouts
- Visual polish on existing component shells

### Handover steps (Claude Code → Cursor):

1. Complete all backend prerequisites for the UI task
2. Write the React Query hook the component will consume
3. Define TypeScript props interface for the component
4. Write one reference component showing the pattern in action
5. Update `.cursor/cursor-tasks.md`:
   - Change status to `[READY]`
   - Add: hook name, props interface file path, reference component path
6. Do NOT build the UI component — leave it for Cursor

### After Cursor returns a component:

1. Run: `npm run lint && npm run typecheck && npm run test:unit`
2. Fix any integration issues
3. Mark task `[DONE]` in `.cursor/cursor-tasks.md`
4. Continue with next backend prerequisite

---

## Non-Negotiable Rules

1. No API keys in client bundle — all sensitive calls via `src/api/` handlers
2. All AI calls via `src/lib/ai/client.ts` only — no direct SDK imports elsewhere
3. All DB queries via Drizzle — no raw SQL strings in route handlers
4. All forms via react-hook-form + zod — no uncontrolled inputs
5. No useEffect for data fetching — React Query always (see `.claude/skills.md`)
6. Language context in every AI call — user language drives all AI output
7. Credits deducted atomically in DB before AI response is returned
8. Input sanitised at API layer before DB write AND before AI prompt insertion
9. Drizzle schema is the single source of truth — TypeScript types derived from it

---

## Current Phase

See `.claude/phases.md` → **Phase 1 — Foundation**
