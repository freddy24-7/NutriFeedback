# NutriApp — Agent Behaviour Rules

> Claude Code: read this at the start of every session alongside CLAUDE.md.
> These rules govern autonomous decision-making, when to stop and ask,
> and the exact handover protocol with Cursor.

---

## Autonomy Levels

### Proceed without asking:
- Writing new files that follow an established pattern already in the codebase
- Running tests (`vitest run`, `playwright test`)
- Running lint and type-check (`eslint --fix`, `tsc --noEmit`)
- Installing packages already listed in the approved stack
- Modifying Drizzle schema and generating migrations (dev branch only)
- Writing or updating translation keys — always update both locale files
  in the same operation
- Refactoring within a single file where observable behaviour does not change
- Updating `.cursor/cursor-tasks.md` to mark tasks `[READY]` or `[DONE]`
- Adding or updating tests for code you just wrote

### Ask before proceeding:
- Installing a package NOT in the approved stack
- Deleting any file
- Applying Drizzle migrations to staging or production Neon branches
- Changing any security-related code (auth middleware, sanitisation,
  rate limiting, credit deduction logic)
- Modifying `src/lib/ai/client.ts`
- Any change that touches the Stripe payment or webhook flow
- Changing the on-signup provisioning logic (user_profiles or user_credits)
- Writing a database query that does NOT filter by `userId`
  (unless explicitly public data — confirm before proceeding)

### Always stop and prompt the human:
- A required environment variable is missing from `.env.local`:
  ```
  ⚠️  HUMAN INPUT NEEDED
  Key required: [KEY_NAME]
  Where to get it: [URL]
  Add to .env.local, then reply "ready" to continue.
  ```
- A phase test gate has failed and the fix would require an architectural change
- Two valid approaches exist with meaningfully different long-term trade-offs
- End of any phase — confirm before starting the next phase
- Any security decision not covered by `docs/security.md`
- A Cursor task is complete and needs Claude Code review before marking done

---

## Phase Discipline

1. Read `docs/phases.md` (or `.claude/phases.md`) at the start of each session
2. Identify the current phase and work only on tasks within it
3. When all Claude Code tasks in a phase are complete, run the full test gate
4. If all tests pass: update phase status in `phases.md`, then stop and
   notify the human before starting the next phase
5. If any test fails: fix it before declaring the phase complete — never skip
6. Never begin Phase N+1 without explicit human confirmation

---

## Neon Branch Discipline

- Local development: always use `DATABASE_URL` (dev Neon branch)
- Never use `DATABASE_URL_PROD` in any local or test context
- Schema changes: edit `src/lib/db/schema.ts` → generate → migrate (dev only)
- CI applies migrations to `staging` branch automatically
- Production migrations require explicit human sign-off

---

## Environment Variable Protocol

When any required env var is missing, output this exact block and stop:

```
⚠️  HUMAN INPUT NEEDED
Key required: [KEY_NAME]
Where to get it: [exact URL or instruction]
Once added to .env.local, reply "ready" to continue.
```

Do not attempt to work around a missing key. Do not use a fallback value.
Do not proceed until the human replies "ready".

---

## Error Handling Protocol

1. Read the full error output — never truncate
2. If it is an environment or config issue → output `⚠️ HUMAN INPUT NEEDED`, stop
3. If it is a code issue → attempt one fix, re-run, check result
4. If still failing after one fix attempt → output the full error and your
   analysis, then await human input. Do not loop.

---

## File Discipline

- Never modify Drizzle migration files that have already been applied
  (identified by timestamp prefix). Create new migrations instead.
- When adding a translation key: update BOTH locale files in the same
  operation — never commit one without the other
- When adding a new Hono route: also add its rate limit config to
  `src/lib/redis/client.ts` and its entry to `docs/security.md`
- When adding a new public route: update the sitemap generator and
  check `robots.txt`

---

## Testing Protocol

After completing any set of tasks:
1. `vitest run` — fix all failures before continuing
2. `eslint .` — fix all errors (warnings acceptable, but note them)
3. `tsc --noEmit` — fix all type errors
4. Phase gates only: `playwright test`

Never commit code with failing unit tests or TypeScript errors.

---

## ═══════════════════════════════════════════════
## CURSOR HANDOVER PROTOCOL
## ═══════════════════════════════════════════════

Cursor runs Opus models and handles complex, visually rich UI components.
Claude Code handles all backend, data fetching, business logic, and
structurally simple UI. This division is strict.

---

### Claude Code owns — never delegate to Cursor:

- All Hono API routes and middleware
- All Drizzle schema and migrations
- The AI client abstraction (`src/lib/ai/client.ts`)
- Auth flow and session management
- Security layer (sanitisation, rate limiting, access control)
- The full test suite
- CI/CD configuration
- All React Query hooks in `src/hooks/`
- All Zustand stores in `src/store/`
- i18n configuration and locale files
- Credits ledger and billing logic
- Components where the primary complexity is data or business logic
- Simple structural UI: form shells, basic nav links, toggles, badges
  that don't require animation or multi-state Tailwind composition

---

### Cursor owns — complex UI only:

Components that are:
- Visually rich with multiple interactive states
- Animation-heavy (scanner overlay, chatbot drawer, onboarding flow)
- Layout-complex across mobile and desktop breakpoints
- Explicitly marked `[CURSOR]` in `phases.md`
- Listed as `✅ READY` in `.cursor/cursor-tasks.md`

---

### Mandatory prerequisites before any Cursor task is marked READY:

Claude Code must complete ALL of these before marking a task ready:

1. **Props type defined** in `src/types/components.ts`
2. **React Query hook written and tested** in `src/hooks/`
3. **API endpoint working** and returning the correct response shape
4. **At least one reference component** exists in the codebase for Cursor to follow
5. **Task entry written** in `.cursor/cursor-tasks.md` with the full template below

---

### Cursor task entry template (copy exactly):

```markdown
### [ID] — ComponentName
**Status:** ✅ READY
**File to create:** `src/components/ComponentName/index.tsx`
**Reference component:** `src/components/[ExistingComponent]/index.tsx`

**Props** (already in `src/types/components.ts`):
\`\`\`ts
type ComponentNameProps = {
  // exact type here — do not change it
};
\`\`\`

**Data hook:** `useHookName()` from `src/hooks/useHookName.ts`
Returns: `{ data, isLoading, error, mutate }`

**Design brief:**
[Visual direction: aesthetic tone, motion style, colour token usage,
 which design system tokens to apply from tailwind.config.ts]

**States to implement:**
- Loading: [description — use skeleton from P6-01 if available]
- Empty: [description]
- Error: [description]
- Default: [description]
- [any other interaction states]

**Translation keys** (already added to both locale files by Claude Code):
- `section.key` — "English value"

**Accessibility requirements:**
- [specific aria roles, keyboard behaviour, focus management]

**Cursor must not:**
- Use useEffect for data fetching — use the hook listed above
- Hardcode any user-visible string — use useTranslation()
- Add new npm dependencies without checking with Claude Code first
- Change the props interface
```

---

### After Cursor delivers a component — Claude Code review steps:

1. `eslint src/components/ComponentName/` — fix any violations
2. `tsc --noEmit` — fix type errors
3. `vitest run` — fix integration failures
4. Write or verify component test file exists
5. Mark `[DONE]` in `.cursor/cursor-tasks.md`
6. Tick the checkbox in `phases.md`
7. If the component has accessibility requirements: run axe-core on it

---

## Communication Style

- Use checkboxes to show progress within a phase
- Flag blockers immediately — do not work around them silently
- When making a non-obvious architectural decision, leave a brief inline
  comment in the code explaining why
- Never invent API behaviour — if unsure how an external API works,
  say so and reference the documentation URL rather than guessing
