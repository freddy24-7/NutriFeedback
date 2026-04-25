# NutriApp

A Progressive Web App for flexible nutrition tracking. Log what you eat in as much or as little detail as you choose — text descriptions, barcode scans, or AI-parsed meals. The app tracks consumption over time and generates personalised AI tips.

**Core philosophy:** More input = more accurate feedback. Less input = still useful, never punishing.

---

## Tech Stack

### Frontend

| Technology                            | Role                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| React 18 + Vite + TypeScript (strict) | App framework                                                           |
| Tailwind CSS                          | Styling — utility classes only, design tokens via CSS custom properties |
| TanStack Query v5                     | All server state — no raw `useEffect` for data fetching                 |
| Zustand                               | Global UI state only (theme, language preference)                       |
| react-hook-form + zod                 | All forms — always paired, never uncontrolled inputs                    |
| i18next + react-i18next               | EN + NL full coverage, including AI responses                           |
| better-auth                           | Auth client — `createAuthClient()`, `authClient.useSession()`           |
| Workbox                               | PWA service worker, offline fallback, precaching                        |
| @zxing/browser                        | Barcode scanning via device camera                                      |
| Dexie.js                              | IndexedDB for offline-first food log queue                              |
| Fuse.js                               | FAQ fuzzy matching for chatbot                                          |
| React Helmet Async                    | Per-route SEO meta tags                                                 |

### Backend / API

| Technology                 | Role                                                  |
| -------------------------- | ----------------------------------------------------- |
| Hono                       | Lightweight API framework on Vercel Edge Functions    |
| Neon (serverless Postgres) | Primary database — EU Frankfurt region                |
| Drizzle ORM                | Type-safe queries, schema-as-source-of-truth          |
| Drizzle Kit                | Migration CLI (`generate`, `migrate`, `studio`)       |
| Better Auth (server)       | Session management — sessions stored in Neon Postgres |
| Upstash Redis              | Rate limiting (sliding window) + response caching     |

### AI

| Context                          | Provider                            |
| -------------------------------- | ----------------------------------- |
| Development — all features       | Google Gemini 1.5 Flash (free tier) |
| Production — food parsing + tips | Anthropic Claude API                |
| Chatbot — always                 | Google Gemini 1.5 Flash             |

All AI calls are routed through `src/lib/ai/client.ts` exclusively. Provider SDKs are never imported anywhere else.

### External Services

| Service               | Role                                                     |
| --------------------- | -------------------------------------------------------- |
| Open Food Facts API   | Barcode product lookup (3M+ products)                    |
| USDA FoodData Central | Raw ingredient nutrition data                            |
| Stripe Checkout       | Payments — EU SCA compliant, hosted page                 |
| Resend                | Transactional email (welcome, tips digest, contact form) |

### Testing

| Tool                 | Role                                            |
| -------------------- | ----------------------------------------------- |
| Vitest               | Unit tests + integration tests                  |
| Playwright           | End-to-end tests (Chromium + Mobile Safari)     |
| @axe-core/playwright | Automated accessibility audits (WCAG 2.1 AA)    |
| @lhci/cli            | Lighthouse CI (Performance, Accessibility, SEO) |
| Neon DB branching    | Isolated database per test environment          |

### Tooling & Infrastructure

| Tool                                   | Role                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| ESLint + jsx-a11y + @typescript-eslint | Lint with accessibility enforcement                               |
| Prettier                               | Code formatting                                                   |
| Husky + lint-staged                    | Pre-commit enforcement (lint → typecheck)                         |
| GitHub Actions                         | CI/CD — lint → typecheck → unit → integration → e2e → Lighthouse  |
| Vercel                                 | Hosting — preview deployments on every PR, Edge Functions for API |

---

## Architecture

```
nutriapp/
├── src/
│   ├── api/                  ← Hono route handlers (Vercel Edge Functions)
│   │   ├── ai/               ← parse-food, generate-tips, chat
│   │   ├── barcode/          ← Open Food Facts + USDA lookup
│   │   ├── payments/         ← Stripe checkout, webhook, discount codes
│   │   ├── contact/          ← Resend email
│   │   └── _middleware/      ← auth, rate limit, sanitise
│   ├── components/           ← UI components (Cursor-built)
│   ├── pages/                ← Route-level pages
│   ├── lib/
│   │   ├── ai/client.ts      ← Unified AI abstraction (Gemini/Claude)
│   │   ├── db/schema.ts      ← Drizzle schema — single source of truth for all DB types
│   │   └── redis/client.ts   ← Upstash client + rate limit configs
│   ├── hooks/                ← React Query hooks only
│   ├── store/                ← Zustand stores
│   ├── types/                ← Shared TypeScript types
│   └── utils/                ← Pure utility functions
├── public/
│   ├── locales/en/           ← English translations
│   ├── locales/nl/           ← Dutch translations
│   └── faq/faq.json          ← Bilingual chatbot FAQ
├── tests/
│   ├── unit/                 ← Pure function + hook tests
│   ├── integration/          ← API route tests against real Neon dev branch
│   └── e2e/                  ← Playwright browser tests
├── drizzle/migrations/       ← Generated SQL — never hand-edit
├── .claude/                  ← Claude Code context (CLAUDE.md, phases, skills, agents)
└── .github/workflows/ci.yml  ← CI/CD pipeline
```

**Request flow:**
Browser → Vercel CDN (static assets) or Edge Function (`/api/*`) → Hono middleware stack (CORS → rate limit → auth → credit check) → handler → Neon DB / AI provider / external API

---

## Key Design Decisions

**Drizzle schema as single source of truth** — TypeScript types for all DB entities are derived directly from the schema with `$inferSelect` / `$inferInsert`. No type duplication, no drift.

**React Query for all server state** — eliminates `useEffect` data fetching entirely. Loading, error, and caching behaviour is consistent across the app.

**AI provider abstraction** — a single `generateAIResponse()` function routes to Gemini in development (free, fast) and Claude in production (quality). The chatbot always uses Gemini. No API keys ever reach the client bundle.

**Neon branching per environment** — `dev`, `staging`, and `main` are separate Neon branches. Integration tests run against `dev`, CI runs against `staging`, production uses `main`. Migrations are never applied to production without explicit sign-off.

**Credits deducted atomically before AI calls** — the credit ledger is decremented in a DB transaction before the AI provider is called. This prevents over-consumption on retries or concurrent requests.

**Two-layer input sanitisation** — client-side (DOMPurify) and server-side (Hono middleware). AI prompts additionally wrap user input in `<user_input>` delimiters to prevent prompt injection.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) project (EU Frankfurt) with `main`, `dev`, and `staging` branches
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for payment testing)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd nutriapp
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in .env.local — comments in the file link to each service

# 3. Apply DB schema
npx drizzle-kit migrate

# 4. Seed dev data
psql $DATABASE_URL_UNPOOLED < neon/seed.sql

# 5. Start dev server
npm run dev
```

### Scripts

```bash
npm run dev               # Dev server at http://localhost:5173
npm run build             # Production build (includes prerender + PWA)
npm run preview           # Preview production build locally

npm run lint              # ESLint
npm run lint:fix          # ESLint with auto-fix
npm run typecheck         # TypeScript (no emit)
npm run format            # Prettier

npm run test:unit         # Vitest unit tests
npm run test:integration  # Vitest integration tests (needs Neon dev branch)
npm run test:e2e          # Playwright e2e tests
npm run test:i18n         # EN/NL translation completeness check
npm run test              # All tests

npx drizzle-kit generate  # Generate SQL from schema changes
npx drizzle-kit migrate   # Apply to DATABASE_URL_UNPOOLED
npx drizzle-kit studio    # Visual DB browser at localhost:4983
```

---

## Development Workflow

This project uses a two-agent model:

- **Claude Code** — backend, API routes, DB migrations, test suite, CI/CD, and one reference component per UI pattern
- **Cursor (Opus)** — UI components, animations, responsive layouts

The handover is managed via `.cursor/cursor-tasks.md`. Claude Code marks tasks `[READY]` only after the API, hook, and props type are in place. Cursor never touches API routes or hooks.

See `.claude/phases.md` for the phased build plan and current status.

---

## Language Support

Full EN + NL throughout:

- UI strings via i18next (`public/locales/`)
- AI responses include language instruction in every prompt
- Personalised tips stored in both languages in the DB in a single generation pass
- Language toggle persists per user via Zustand + localStorage

---

## Accessibility

- WCAG 2.1 AA compliant — automated via axe-core in Playwright
- Lighthouse Accessibility score: 100 across all public pages
- jsx-a11y ESLint plugin enforced at lint time
- All interactive elements keyboard-reachable
- Focus management on modals and drawers

---

## Deployment

Hosted on Vercel. Every push to `main` deploys to production. Every PR gets a preview deployment.

See `.claude/phases.md → Production deploy checklist` for the full list of env vars and service wiring required before going live.
