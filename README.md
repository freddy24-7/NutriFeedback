# NutriApp

A flexible nutrition tracking PWA. Log what you eat, get AI-powered tips,
scan barcodes, and track your nutrition over time — as accurately or loosely
as you like.

---

## Quick Start

### Prerequisites
- Node.js 20+
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (Phase 4+)
- A [Neon](https://neon.tech) project with `main`, `dev`, and `staging` branches

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd nutriapp
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in .env.local — see comments in file for where to get each key

# 3. Apply DB schema (uses DATABASE_URL_UNPOOLED)
npx drizzle-kit migrate

# 4. Seed development data
psql $DATABASE_URL_UNPOOLED < neon/seed.sql

# 5. Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build locally

npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # TypeScript type check (no emit)
npm run format       # Prettier

npm run test:unit    # Vitest unit tests
npm run test:integration  # Vitest integration tests (needs Neon dev branch)
npm run test:e2e     # Playwright e2e tests
npm run test:i18n    # Check EN/NL translation completeness
npm run test         # All tests

# DB tooling
npx drizzle-kit generate   # Generate SQL migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to DATABASE_URL_UNPOOLED
npx drizzle-kit studio     # Visual DB browser at localhost:4983
```

---

## Project Structure

```
.claude/          ← Claude Code context files (read these first)
docs/             ← Architecture, security, i18n docs
public/
  locales/        ← EN + NL translation files
  faq/            ← Chatbot FAQ (bilingual JSON)
src/
  api/            ← Hono route handlers (Vercel Edge Functions)
  components/     ← UI components
  pages/          ← Route-level pages
  lib/
    ai/           ← Unified AI client (Gemini/Claude)
    db/           ← Neon + Drizzle client and schema
    redis/        ← Upstash Redis client
  hooks/          ← React Query hooks
  stores/         ← Zustand stores
  types/          ← Shared TypeScript types
  utils/          ← Pure utility functions
neon/
  seed.sql        ← Dev seed data
drizzle/
  migrations/     ← Generated SQL migration files
tests/
  unit/
  integration/
  e2e/
.github/
  workflows/      ← CI/CD (GitHub Actions)
```

---

## AI Workflow

This project uses two AI providers:

| Context | Provider |
|---------|---------|
| Development (all features) | Google Gemini 1.5 Flash |
| Production (non-chatbot) | Anthropic Claude |
| Chatbot (always) | Google Gemini 1.5 Flash |

Switch is automatic based on `NODE_ENV`. All AI calls go through
`src/lib/ai/client.ts` — never call provider SDKs directly.

---

## Development Workflow

1. **Claude Code** handles backend, API routes, DB migrations,
   test suite, and sets patterns with reference components
2. **Cursor** handles UI components following Claude Code's patterns
   (see `.claude/phases.md` for current task list)
3. Tests must pass before each phase advances (see `.claude/phases.md`)

---

## Language Support

Full EN + NL support throughout:
- UI strings via i18next
- AI responses include language instruction in every prompt
- Tips stored in both languages in DB
- Language toggle persisted per user

---

## Contributing

See `.claude/phases.md` for the current phase and open tasks.

Run `npm run lint && npm run typecheck && npm run test:unit` before
committing. Husky enforces this automatically.
