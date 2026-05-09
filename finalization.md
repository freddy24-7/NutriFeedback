# NutriApp — Finalization Tasks

Items are grouped by the deploy stage at which they can be completed or verified.

---

## Stage 1 — Dev (now, before first Vercel deploy)

Everything here is pure code work — no live keys or external configuration needed.

### Stripe Customer Portal — API route + UI

Active subscribers currently have no way to cancel, update their payment method, or change plan. This needs a backend route and a UI button before any real money changes hands.

**API route** — add `POST /api/payments/portal` (authenticated) to `src/api/routes/payments.ts`:

```ts
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId, // from subscriptions table
  return_url: `${appUrl}/account`,
});
return c.json({ url: session.url });
```

**UI** — add a "Manage subscription" section to `src/pages/AccountSettings.tsx`, shown only when `sub.status === 'active'`. Calls the portal endpoint and follows the redirect. The portal configuration in the Stripe dashboard (Billing → Customer portal) is needed for the redirect to work — that's a Stage 2 step.

### `invoice.payment_failed` webhook case

When a renewal payment fails Stripe fires `invoice.payment_failed`. Currently unhandled — a subscriber whose card expires stays `active` in the DB until manually fixed. Add a case to the webhook switch in `src/api/routes/payments.ts`:

```ts
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = invoice.subscription as string | null;
  if (!subId) break;
  const sub = await stripe.subscriptions.retrieve(subId);
  const userId = sub.metadata?.userId;
  if (!userId) break;
  await db.update(subscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
  // Optional: send a payment-failed email via Resend
  break;
}
```

Also add `past_due` to the subscription status union type in the schema and client-side types, and handle it gracefully in the paywall and UI.

### Low-credit email notification

When credits drop to zero no email is sent. Resend is already wired. Add a post-deduction check in `src/api/routes/ai.ts` — after each credit deduction, if `creditsRemaining` hits a threshold (e.g. 3 or 0), send a Resend email to the user's Clerk email address.

### Paywall dismissal — persist to sessionStorage

`paywallDismissed` is currently local React state. A user who dismisses and then uses their last credit won't see the paywall again until they refresh. Persist the flag to `sessionStorage` so it survives soft navigations but resets on a new tab.

### Clerk JWT key — production app key

The RSA public key hardcoded in `src/api/middleware/auth.ts` is from the dev Clerk application (`shining-aphid-30.clerk.accounts.dev`). The production Clerk app will have a different key.

**Option A (minimal change):** fetch the production JWKS from `https://<prod-clerk-domain>/.well-known/jwks.json`, update `CLERK_JWT_KEY`, and document the rotation procedure.

**Option B (more robust):** remove `jwtKey` from `verifyToken()` and rely solely on `secretKey`. This makes one extra Clerk API call per request but eliminates the hardcoded key entirely. Recommended if you want zero-maintenance auth.

Do this before deploying with the production Clerk app.

### i18n — Dynamic strings in AiTipCard

Hardcoded English in `src/components/AI/AiTipCard/index.tsx` inside `derivePatternInsight()` (~lines 82–140): template literals composing sentences from live counts and percentages. Needs restructuring into `t()` with named interpolation, plus the "Why 30 Plants?" modal (lines ~381–554) which has fully hardcoded category labels, example foods, and tips.

### Zod form validation messages

`src/pages/SignUp.tsx` and `src/pages/ForgotPassword.tsx` have schema validation messages (`'Required'`, `'At least 8 characters'`, `'Passwords do not match'`) hardcoded in English. Move to `t()` calls using existing keys.

### PWAInstallPrompt i18n inconsistency

`src/components/UI/PWAInstallPrompt/index.tsx` uses an internal `COPY` object instead of `useTranslation`. Works correctly but is inconsistent. Low risk — fix when convenient.

---

## Stage 2 — Vercel (test keys, pre-live verification)

These items either require Vercel to be running, or are configuration steps in external dashboards that use test credentials.

### Stripe dashboard — register production webhook endpoint

In the Stripe dashboard (test mode), register:
`https://your-app.vercel.app/api/payments/webhook`

Subscribe to: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Copy the signing secret into the `STRIPE_WEBHOOK_SECRET` Vercel environment variable.

### Stripe dashboard — configure Customer Portal

In Stripe → Billing → Customer portal: enable cancellations, plan switching (if you offer yearly), and payment method updates. The portal API call written in Stage 1 will fail until this is configured.

### Vercel environment variables — full set

Ensure all required variables are set in Vercel (Settings → Environment Variables). The full list from `.env.example`:
`DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` (if using), `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` (or omit if removed in Stage 1), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `IP_HASH_SECRET`, `VITE_APP_URL`, `ADMIN_USER_ID`, `VITE_ADMIN_USER_ID`.

### End-to-end payment flow smoke test (test mode)

With Stripe test keys on Vercel, verify the full loop manually:

1. Sign up → credits assigned
2. Use all credits → paywall appears
3. Click upgrade → Stripe Checkout opens (test card `4242 4242 4242 4242`)
4. Complete checkout → webhook fires → DB status becomes `active` → paywall gone
5. Go to account → "Manage subscription" → Stripe portal opens → cancel
6. Cancellation webhook fires → DB status becomes `cancelled`

### Clerk production app — update JWT key

Follow whichever approach was chosen in Stage 1 (update the hardcoded key, or switch to `secretKey`-only). This must be done before Clerk test keys are swapped for live ones.

### Neon — create production branch

In the Neon dashboard, create a `production` branch from `main`. Set `DATABASE_URL` in Vercel's production environment to the production branch connection string. Run `npm run db:migrate` against it.

### Legal pages

`src/pages/Terms.tsx` and `src/pages/Privacy.tsx` show a "pending legal review" notice. Replace with actual content before opening to the public. English-only is acceptable for Dutch legal text (common practice), but the pages must be substantive.

---

## Stage 3 — Live keys (go-live)

Only two steps remain at this stage — everything else should already be working.

### Swap all keys to live values

In Vercel production environment:

| Variable                      | Change                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `STRIPE_SECRET_KEY`           | `sk_test_…` → `sk_live_…`                                 |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` → `pk_live_…`                                 |
| `STRIPE_PRICE_ID_MONTHLY`     | Test price ID → live price ID                             |
| `STRIPE_WEBHOOK_SECRET`       | Re-register the endpoint in Stripe live mode — new secret |
| `VITE_CLERK_PUBLISHABLE_KEY`  | Test key → production key                                 |
| `CLERK_SECRET_KEY`            | Test key → production key                                 |

The Clerk JWT key update (if using Option A from Stage 1) also happens here — fetch from the production Clerk app's JWKS endpoint.

### Post-go-live: monitor first real payments

Watch Stripe dashboard events and Vercel function logs for the first 24 hours. Key things to confirm:

- `checkout.session.completed` fires and DB status flips to `active`
- `invoice.paid` renews `currentPeriodEnd` correctly on month rollover
- No 400s from webhook signature mismatches (wrong `STRIPE_WEBHOOK_SECRET`)
- `invoice.payment_failed` is handled and doesn't leave ghost subscriptions

---

## Completed ✓

- Admin dashboard — user management, API call counts, inline credit adjustment
- Low-credit warning banner on dashboard (≤5 credits, trial users)
- One-tap PWA install button in nav
- Unit tests: paywallMiddleware (9 cases)
- Integration tests: admin routes (14 cases), payments webhook (7 cases)
- E2E test suite stabilised (108 tests passing, 5 skipped for mobile)
- Security headers in `vercel.json` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Input sanitisation on all API routes (server-side, before DB write and AI prompt)
- Prompt injection defence in all AI system prompts (`INJECTION_DEFENSE` constant)
- GDPR: data export (`GET /api/user/export`) and account deletion (`DELETE /api/user/account`) with tax-compliant subscription anonymisation
- Rate limiting on all AI, payment, and contact routes (Upstash sliding window)
- IP hashing with HMAC-SHA256 for GDPR-compliant rate limit identifiers
- Yearly plan dead code removed (`STRIPE_PRICE_ID_YEARLY`, `pro-yearly` type, `.env.example`)
- `invoice.payment_failed` webhook handler — sets `past_due` status, emails user via Resend
- `past_due` subscription status: DB enum, API type, badge colour, NL/EN translations
- `POST /api/payments/portal` — Stripe Customer Portal session, scoped to active/past_due
- `useManageSubscription` hook + Manage Subscription section on `/account` (with past_due warning banner)
- Zero-credit email notification after every AI deduction (`maybeSendLowCreditEmail` in all three AI routes)
- Paywall dismissal persisted to `sessionStorage` (survives soft navigations, resets per tab)
- Clerk JWT switched to `secretKey`-only verification — no hardcoded public key, no rotation maintenance
