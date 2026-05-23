# NutriApp — End Finalization Checklist

---

## Stage 1 — Code tasks (remaining)

- [ ] **i18n: `AiTipCard` — `derivePatternInsight()`** (`src/components/AI/AiTipCard/index.tsx` ~lines 82–140): Replace hardcoded English template literals with `t()` calls using named interpolation.
- [ ] **i18n: `AiTipCard` — "Why 30 Plants?" modal** (`src/components/AI/AiTipCard/index.tsx` ~lines 381–554): Replace hardcoded category labels, example foods, and tips with `t()` calls.
- [ ] **i18n: Zod validation messages in `SignUp.tsx`** (`src/pages/SignUp.tsx`): Replace `'Required'`, `'At least 8 characters'`, `'Passwords do not match'` with `t()` calls using existing i18n keys.
- [ ] **i18n: Zod validation messages in `ForgotPassword.tsx`** (`src/pages/ForgotPassword.tsx`): Same as above — move hardcoded English schema messages to `t()` calls.
- [ ] **i18n: `PWAInstallPrompt`** (`src/components/UI/PWAInstallPrompt/index.tsx`): Replace internal `COPY` object with `useTranslation()` — low risk, fix when convenient.

---

## Stage 1 — Completed ✓

- [x] Stripe Customer Portal API route (`POST /api/payments/portal`)
- [x] `invoice.payment_failed` webhook handler — sets `past_due`, emails user
- [x] `past_due` in DB schema enum + client-side types
- [x] Low-credit email notification (`maybeSendLowCreditEmail` in all three AI routes)
- [x] Paywall dismissal persisted to `sessionStorage`
- [x] Clerk JWT switched to `secretKey`-only — no hardcoded RSA key
- [x] `useManageSubscription` hook + "Manage subscription" section on `/account`
- [x] `Terms.tsx` and `Privacy.tsx` — full legal content, no placeholder notices

---

## Stage 2 — External configuration (Vercel + dashboards)

- [ ] **Stripe → Webhooks**: Register `https://your-app.vercel.app/api/payments/webhook` in the Stripe dashboard (test mode). Subscribe to: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel.
- [ ] **Stripe → Billing → Customer Portal**: Enable cancellations and payment method updates. The portal API route is live but sessions will fail until this is configured.
- [ ] **Vercel → Environment Variables**: Confirm all variables are set — `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `IP_HASH_SECRET`, `VITE_APP_URL`, `ADMIN_USER_ID`, `VITE_ADMIN_USER_ID`.
- [ ] **Neon → Production branch**: Create a `production` branch in the Neon dashboard. Point Vercel's production `DATABASE_URL` at it. Run `npm run db:migrate` against the production branch.
- [ ] **Clerk → JWT key**: Confirm `secretKey`-only verification is working with the production Clerk app (no additional changes needed if Option B was followed in Stage 1).
- [ ] **Legal pages**: Confirm `Terms.tsx` and `Privacy.tsx` content has been through actual legal review before opening to the public.
- [ ] **End-to-end payment smoke test** (test mode, on Vercel):
  - [ ] Sign up → credits assigned
  - [ ] Use all credits → paywall appears
  - [ ] Click upgrade → Stripe Checkout opens (test card `4242 4242 4242 4242`)
  - [ ] Complete checkout → webhook fires → DB status flips to `active` → paywall gone
  - [ ] Go to account → "Manage subscription" → Stripe portal opens → cancel
  - [ ] Cancellation webhook fires → DB status becomes `cancelled`

---

## Stage 3 — Go-live key swaps (Vercel production environment)

- [ ] `STRIPE_SECRET_KEY`: `sk_test_…` → `sk_live_…`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`: `pk_test_…` → `pk_live_…`
- [ ] `STRIPE_PRICE_ID_MONTHLY`: Test price ID → live price ID
- [ ] `STRIPE_WEBHOOK_SECRET`: Re-register endpoint in Stripe **live** mode → new signing secret
- [ ] `VITE_CLERK_PUBLISHABLE_KEY`: Test key → production key
- [ ] `CLERK_SECRET_KEY`: Test key → production key
- [ ] **Post-go-live monitor** (first 24 hours): Watch Stripe dashboard events and Vercel function logs — confirm `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed` all fire correctly and no webhook 400s from signature mismatches.

Multi-tenancy:
What you should verify manually (external systems)
These can't be confirmed from the codebase alone:

Clerk: Confirm that no JWT claims (e.g. publicMetadata) are being trusted server-side without validation. The codebase only uses payload.sub (the user ID), which is correct.
Neon / database: Confirm there are no shared DB roles or row-level security policies that could accidentally allow cross-user reads. Since all isolation is at the application layer (Drizzle WHERE clauses), a misconfigured DB connection string shared between users would bypass all of it — but that's a deployment concern, not a code concern.
Stripe webhooks: The invoice.payment_failed and checkout.session.completed handlers look up the user via metadata.userId set during checkout. Confirm that userId is being set correctly in Stripe metadata at checkout time, since a mismatch there could associate a subscription with the wrong user.
Bottom line: The app is correctly built for multi-tenancy. Fix useParseFood.ts to use Bearer tokens, delete the dead useCredits.ts, and you're clean.
