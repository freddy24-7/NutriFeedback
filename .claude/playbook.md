# Claude Code Project Playbook

> A reusable reference distilled from NutriApp. Copy this to any new project's
> `.claude/` directory and adapt it. It covers the CLAUDE.md structure, skills
> conventions, agent behaviour rules, testing strategy, CI/CD, and the
> Claude Code ↔ Cursor handover protocol — everything that proved effective.

---

## 1. Recommended Tech Stack (Validated Combination)

This stack was used in NutriApp and worked well end-to-end. Swap individual
pieces as needed, but keep the same architectural roles.

| Layer         | Choice                               | Why                                                                    |
| ------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Framework     | React 18 + Vite + TypeScript strict  | Fast builds, full type safety, wide ecosystem                          |
| Styling       | Tailwind CSS + CSS custom properties | No runtime, design tokens via vars, dark mode trivial                  |
| Server state  | TanStack Query v5                    | Eliminates useEffect fetching, handles caching/loading/error uniformly |
| UI state      | Zustand + persist middleware         | Minimal boilerplate, persists to localStorage cleanly                  |
| Forms         | react-hook-form + zod                | Uncontrolled inputs + runtime validation in one pass                   |
| API layer     | Hono on Vercel Edge                  | Thin, fast, TypeScript-native, deploys instantly                       |
| Database      | Neon (serverless Postgres)           | Branching per environment (dev/staging/prod), serverless-compatible    |
| ORM           | Drizzle ORM + Drizzle Kit            | Schema = source of truth, type-safe queries, migration CLI             |
| Auth          | Better Auth (Neon-native)            | Sessions in Postgres, no external service, GDPR-friendly               |
| Rate limiting | Upstash Redis                        | Sliding window, serverless-compatible, also useful for caching         |
| AI (dev)      | Google Gemini 1.5 Flash              | Free tier, fast, good enough for development                           |
| AI (prod)     | Anthropic Claude API                 | Quality, safety, reliable for user-facing features                     |
| i18n          | i18next + react-i18next              | Mature, namespace support, works with AI prompt injection              |
| PWA           | Workbox (via vite-plugin-pwa)        | Service worker, offline fallback, install prompt                       |
| Payments      | Stripe Checkout (hosted)             | SCA-compliant, no PCI scope, works everywhere                          |
| Email         | Resend                               | Simple API, reliable delivery, good DX                                 |
| Testing       | Vitest + Playwright + axe-core       | Unit/integration + e2e + a11y in one pipeline                          |
| Hosting       | Vercel                               | Edge Functions, preview URLs on every PR, zero config for Vite         |
| CI/CD         | GitHub Actions                       | Tight GitHub integration, free for public repos                        |

---

## 2. CLAUDE.md Structure

Every project should have a `CLAUDE.md` at the repo root. Claude Code reads it
at the start of every session. Keep it focused — it is the master context, not
a tutorial.

### Required sections

```markdown
# [Project Name] — Claude Code Master Context

> Read this file first at the start of every session.
> Then read `.claude/phases.md` to confirm the current phase.
> Then read `.claude/skills.md` before writing any code.

## Project Overview

[2–3 sentences: what the app does and the core philosophy]

## Tech Stack

[Table per layer: Frontend / Backend / Database / AI / Testing / Infrastructure]

## Repository Structure

[Directory tree with one-line descriptions per directory]

## Environment Variables

[Full list with: where to get each one, which are server-only vs client-safe]

## Non-Negotiable Rules

[5–10 hard rules. Examples from NutriApp:]

1. No API keys in the client bundle
2. All AI calls via src/lib/ai/client.ts only
3. All DB queries via ORM — no raw SQL strings in route handlers
4. All forms via react-hook-form + zod
5. No useEffect for data fetching — React Query always
6. Language context in every AI call
7. Credits/tokens deducted atomically before AI response is returned
8. Input sanitised at API layer before DB write AND before AI prompt insertion
9. ORM schema is the single source of truth — TypeScript types derived from it

## Current Phase

See .claude/phases.md
```

### What NOT to put in CLAUDE.md

- Coding conventions (those go in `skills.md`)
- Agent behaviour rules (those go in `agents.md`)
- Detailed phase task lists (those go in `phases.md`)
- Information already derivable from the code

---

## 3. skills.md — Coding Conventions

The `skills.md` file teaches both Claude Code and Cursor the patterns to follow.
Structure it by concern. Each section should have a ✅ / ❌ pair so the
rule is immediately clear.

### Sections to always include

**TypeScript**

- Strict mode, no `any`, no non-null assertion (`!`)
- Prefer `type` over `interface`
- Derive types from Zod schemas and ORM schema — never duplicate

**React — useEffect rules** (this is the most important section)

- Never for data fetching → use React Query
- Never for derived state → compute inline or useMemo
- Never for responding to events → call the function directly from the handler
- Never for prop→state sync → use the prop directly or lift state
- ONLY for: third-party imperative setup with cleanup, external subscriptions with cleanup, focus management after conditional render

**Data fetching — React Query**

- All server state in `src/hooks/`, one file per domain
- queryKey always includes all variables the query depends on
- All fetch errors thrown (not returned) so React Query catches them
- staleTime set deliberately — never leave it at 0 for data that doesn't change per second

**Database — ORM**

- Schema file = source of truth for all TypeScript DB types
- Never raw SQL in route handlers
- All queries parameterised (ORM handles this automatically)
- Schema changes: edit schema → generate migration → review SQL → migrate dev branch

**API layer**

- Middleware order: CORS → rate limit → auth → business-specific checks → handler
- Every handler: validate input (Zod) → sanitise → DB/AI call → return typed response
- Rate limit every public endpoint; tighter limits on AI endpoints

**Forms**

- Always react-hook-form + zod, always paired
- Error messages in `role="alert"` elements linked via `aria-describedby`

**State management**

- Server state → React Query; UI-only global state → Zustand; local component state → useState
- Zustand stores: one per concern, `persist` middleware for anything that should survive reload

**AI abstraction**

- Single unified client file — never import provider SDKs directly in handlers
- Language instruction always first line of system prompt
- User input always wrapped in delimiter tags to prevent prompt injection
- Gemini in development (free), Claude in production (quality)

**Security**

- Two-layer sanitisation: client-side AND server-side
- Prompt injection defence: `<user_input>` delimiters + system prompt instruction
- Never store raw IPs — hash with a rotatable secret (GDPR)
- Rate limit by userId for authenticated, by IP hash for anonymous

**Internationalisation**

- Never hardcode user-visible strings
- When adding a string: update ALL locale files in the same commit
- Use `[TODO-NL]: English text` placeholder for untranslated strings; CI catches it
- Language instruction in every AI call — AI output language must match user language

**Accessibility**

- Every icon button: `aria-label`
- Every input: associated label or `aria-label`
- Error messages: `role="alert"` + `aria-describedby`
- Never `outline: none` without a visible alternative
- Colour contrast: 4.5:1 for body text, 3:1 for large text (WCAG AA)
- When visually hiding something that contains focusable elements: use `inert` attribute, not just `aria-hidden` or CSS — `aria-hidden` hides from AT but does NOT prevent focus

**Naming**

- Components: PascalCase
- Hooks: camelCase + `use` prefix
- Stores: camelCase + `Store` suffix (e.g. `useUIStore`)
- API routes: kebab-case
- DB columns: snake_case (ORM maps to camelCase)
- i18n keys: dot-separated camelCase
- Files: kebab-case

---

## 4. agents.md — Agent Behaviour Rules

The `agents.md` file governs Claude Code's autonomous decision-making.
It should be explicit about what requires human approval.

### Sections to always include

**Proceed without asking:**

- Writing files that follow an established pattern
- Running tests, lint, typecheck
- Installing packages already in the approved stack
- Modifying ORM schema and generating migrations (dev branch only)
- Updating translation keys (both locale files in same operation)
- Refactoring within a single file where observable behaviour doesn't change

**Ask before proceeding:**

- Installing a package NOT in the approved stack
- Deleting any file
- Applying migrations to staging or production branches
- Any security-related code (auth, sanitisation, rate limiting, payment flow)
- The AI client abstraction file
- Any query that does NOT filter by the current user's ID

**Always stop and prompt the human:**

- A required environment variable is missing — output a standard block:
  ```
  ⚠️ HUMAN INPUT NEEDED
  Key required: [KEY_NAME]
  Where to get it: [URL or instruction]
  Once added, reply "ready" to continue.
  ```
- A phase test gate fails and the fix requires architectural change
- End of any phase — confirm before starting the next one
- Two approaches with meaningfully different long-term trade-offs

**Phase discipline:**

- Read `phases.md` at the start of every session
- Work only on tasks within the current phase
- When Claude Code tasks complete: run the full test gate, update phases.md, stop and notify
- Never begin Phase N+1 without explicit human confirmation

**Environment/branch discipline:**

- Never use production DB credentials in local or test context
- Never apply migrations to production without sign-off
- Never commit secrets or API keys

**Error handling protocol:**

1. Read the full error — never truncate
2. If env/config issue → `⚠️ HUMAN INPUT NEEDED`, stop
3. If code issue → attempt one fix, re-run, check result
4. If still failing → output full error + analysis, await human. Do not loop.

**File discipline:**

- Never modify already-applied migration files — create new ones
- When adding a translation key: update ALL locale files in one operation
- When adding a new API route: also add rate limit config and security doc entry
- When adding a new public route: update sitemap generator and robots.txt

---

## 5. phases.md — Phased Build Plan

Break the project into phases of 1–2 weeks each, with a hard test gate
between phases. Claude Code never starts Phase N+1 until the gate is green.

### Phase structure template

```markdown
## Phase N — Name

**Goal:** [One sentence — what capability does the user have at the end of this phase]

### Claude Code Tasks

- [ ] Task 1
- [ ] Task 2

### Cursor Tasks [CURSOR]

- [ ] UI component 1 — [PENDING until Claude Code finishes prerequisites]

### ⚠️ Human Actions Required

[List any service accounts, API keys, or infrastructure needed before this phase]

### Phase N Test Gate

**Vitest — unit:**

- [ ] [Specific assertion about a pure function or hook]

**Vitest — integration:**

- [ ] [Specific API endpoint behaviour against real DB]

**Playwright — e2e:**

- [ ] [User-visible flow]

**Manual checks:**

- [ ] [Things that can't be automated]
```

### Recommended phase order for a typical SaaS app

1. **Foundation** — auth, DB, basic CRUD, i18n shell, contact form
2. **AI Integration** — AI client, first AI feature, credit/token system
3. **Core Feature** — the main differentiating feature of the app
4. **Payments** — Stripe, subscription, discount codes, credit expiry
5. **Chatbot / Support** — FAQ-first chatbot, rate limiting
6. **SEO + A11y + Polish** — Lighthouse, axe-core, prerender, skeleton loaders

---

## 6. Testing Strategy

### Three-tier model

```
Unit (Vitest)          → pure functions, hooks, business logic
Integration (Vitest)   → API routes against real DB (dev branch)
E2E (Playwright)       → user flows in a real browser
```

Never collapse these tiers. Unit tests run in milliseconds and catch logic bugs.
Integration tests catch ORM/DB issues that mocks would miss. E2E tests catch
real rendering and interaction bugs that unit tests can't see.

### Unit test rules

- Test pure functions exhaustively (edge cases, error paths)
- Test React Query hooks with a real QueryClient wrapper (not mocked)
- Never mock the database in integration tests — use a real dev branch (Neon branching makes this free)
- Test credit deduction logic with concurrent requests (atomic transaction test)

```ts
// Hook testing pattern
const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);
const { result } = renderHook(() => useMyHook(), { wrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

### Integration test rules

- Use a real database — Neon branching gives you an isolated DB per test environment for free
- Each test suite: create rows → assert → clean up (or use transactions that roll back)
- Test the full API request lifecycle: middleware → handler → DB → response shape
- Always test: rate limit threshold (confirm 429), auth guard (confirm 401 without session), input that triggers validation error (confirm 400)

```ts
// Hono integration test pattern
const res = await app.request('/api/resource', {
  method: 'POST',
  headers: { Cookie: `session=${testSessionToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(validPayload),
});
expect(res.status).toBe(201);
```

### E2E test rules

- Run against the built app (`vite preview`), not the dev server
- Use Playwright's route mocking for external services (Stripe, AI providers) — never hit real APIs in tests
- Mock the session/auth state at the network level, not by navigating through the sign-in flow in every test
- Test both Chromium and Mobile Safari (iOS rendering differs enough to matter)
- Use `test.fixme()` for tests you know need to be written but aren't yet — this marks them as skipped without silently dropping them

```ts
// Session mock helper pattern
async function mockSession(page: Page) {
  await page.route('/api/auth/session', (route) =>
    route.fulfill({ json: { user: { id: 'test-user', email: 'test@example.com' } } }),
  );
}

// Auth-gated page helper
async function gotoAuthenticatedPage(page: Page) {
  await mockSession(page);
  await mockSubscription(page);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}
```

### Accessibility testing

Include axe-core in Playwright as a standard e2e suite. Run it against:

- Every public page (home, pricing, contact, sign-in, sign-up, 404)
- Interactive states: form validation errors, open modals, open drawers

Key axe pitfalls discovered in NutriApp:

- `aria-hidden="true"` on an element that contains focusable children triggers `aria-hidden-focus` — use `inert` attribute instead, which both removes from AT and makes children non-focusable
- Brand colours that look fine visually often fail 4.5:1 contrast — check them before hardcoding in design tokens
- Error message colours (`#ef4444` / red-500) typically fail contrast on light backgrounds — use red-600 or darker

```ts
// axe-core pattern
import AxeBuilder from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
```

### Lighthouse CI

Configure `.lighthouserc.cjs` to run on the production build. Minimum thresholds:

```js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4173/', 'http://localhost:4173/pricing'],
      startServerCommand: 'npx vite preview --port 4173',
      startServerReadyPattern: 'Local',
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

---

## 7. CI/CD Pipeline

### GitHub Actions pipeline order

```
lint + typecheck → secret scan → unit tests → integration tests → e2e tests → Lighthouse
```

Each job depends on the previous. Never run e2e without unit/integration passing first.

### Secret scan job (include in every project)

```yaml
secret-scan:
  name: Secret Leak Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Fail if API keys found in source
      run: |
        if grep -rE '(sk-ant-|AIzaSy|sk_live_|rk_live_|redis://[^$])' src/ \
          --include='*.ts' --include='*.tsx'; then
          echo "Potential secret found in source — failing build"
          exit 1
        fi
```

### Environment variables in CI

- Keep a separate `DATABASE_URL_DEV` secret in GitHub for integration/e2e jobs
- Never use production DB credentials in CI
- `VITE_*` vars that are needed for the build but not secret can be set as plain env vars (not secrets)
- Remove any secrets from old auth providers when you switch (stale secrets in CI cause confusing failures)

---

## 8. Claude Code ↔ Cursor Handover Protocol

### Division of responsibility

**Claude Code owns:**

- All API routes and middleware
- All DB schema and migrations
- AI client abstraction
- Auth flow and session management
- Security layer (sanitisation, rate limiting, access control)
- Full test suite
- CI/CD configuration
- All React Query hooks
- All Zustand stores
- i18n configuration and locale files
- Credits/billing logic
- Simple structural UI (form shells, badges, toggles)

**Cursor owns:**

- Visually rich components with multiple interactive states
- Animation-heavy components (modals, drawers, onboarding)
- Layout-complex components across mobile/desktop
- Only what is explicitly marked `[READY]` in `cursor-tasks.md`

### Before marking any task READY for Cursor

Claude Code must complete ALL of:

1. Props type defined in `src/types/components.ts`
2. React Query hook written and tested in `src/hooks/`
3. API endpoint working and returning the correct response shape
4. At least one reference component exists for Cursor to follow
5. Task entry written in `cursor-tasks.md` with the full template

### cursor-tasks.md task entry template

```markdown
### [ID] — ComponentName

**Status:** ✅ READY
**File to create:** `src/components/ComponentName/index.tsx`
**Reference component:** `src/components/[ExistingComponent]/index.tsx`

**Props** (already in `src/types/components.ts`):
\`\`\`ts
type ComponentNameProps = {
// exact type here — Cursor must not change it
};
\`\`\`

**Data hook:** `useHookName()` from `src/hooks/useHookName.ts`
Returns: `{ data, isLoading, error, mutate }`

**Design brief:**
[Visual direction: aesthetic, motion, colour tokens, Tailwind classes to use]

**States to implement:**

- Loading: [use SkeletonLoader if available]
- Empty: [use EmptyState if available]
- Error: [description]
- Default: [description]

**Translation keys** (already in both locale files):

- `section.key` — "English value" / "Dutch value"

**Accessibility requirements:**

- [specific aria roles, keyboard behaviour, focus management]

**Cursor must not:**

- Use useEffect for data fetching — use the hook listed above
- Hardcode any user-visible string — use useTranslation()
- Add new npm dependencies without checking with Claude Code first
- Change the props interface
```

### After Cursor delivers — Claude Code review steps

1. `eslint src/components/ComponentName/` — fix any violations
2. `tsc --noEmit` — fix type errors
3. `vitest run` — fix integration failures
4. Run axe-core on the component if it has accessibility requirements
5. Mark `[DONE]` in `cursor-tasks.md` and tick the checkbox in `phases.md`

---

## 9. Security Checklist

Include these in every project. Check each one during the final phase.

- [ ] No API keys in the client bundle (grep for `VITE_` in server-only files)
- [ ] All user input sanitised server-side before DB write
- [ ] All user input sanitised before insertion into AI prompts (delimiter tags)
- [ ] Rate limiting on every public endpoint (tighter on AI routes)
- [ ] Auth middleware applied to all non-public routes
- [ ] DB queries always filter by `userId` (no cross-user data leakage)
- [ ] Raw IPs never stored — hash with a rotatable secret
- [ ] CSP header set in `vercel.json` / server headers — allowlist only what you use
- [ ] `X-Frame-Options: DENY` to prevent clickjacking
- [ ] Stripe webhook signature verified before processing events
- [ ] Environment variables: separate values for dev / staging / prod
- [ ] Production DB credentials never used in development or CI

---

## 10. What to Do Differently Next Time

Lessons from NutriApp that weren't obvious at the start:

**Start axe-core tests earlier.** We added them in Phase 6 and discovered colour contrast issues that required changes across many components. Running axe-core from Phase 1 would have caught these at the design token level.

**Fix colour tokens before building components.** Many `brand-500` → `brand-700` changes had to be made across 15+ components because the initial brand colour failed WCAG AA contrast. Define and verify contrast ratios for all design tokens in `index.css` before Cursor starts building.

**Scaffold `test.fixme()` stubs early.** Write the test descriptions (even with empty bodies) during the phase they relate to. This creates a clear record of what needs to be tested and prevents tests from being forgotten entirely.

**Use `inert` not `aria-hidden` for visually hidden interactive elements.** When hiding a component that contains buttons (like a slide-up prompt that slides off screen), `aria-hidden="true"` is not enough — it hides the element from the accessibility tree but the buttons remain focusable. The `inert` HTML attribute solves both at once.

**Add the Cursor handover protocol to agents.md before starting.** The division of Claude Code / Cursor responsibilities should be written before the first line of code. Changing it mid-project creates confusion about who owns what.

**Name the `useSession` chain carefully.** `session?.user.id` throws if `session.user` is undefined. Always `session?.user?.id`. This pattern appears everywhere auth is used — establish the safe pattern in `skills.md` from day one.

**Phase test gates should be specific and measurable.** Vague gates like "all tests pass" hide what was actually verified. Write the gate as concrete assertions: "POST /api/ai/parse-food returns 402 when credits exhausted" is useful; "AI integration works" is not.
