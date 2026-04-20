# NutriApp — Environment Variable Reference

> Auth migrated from Supabase → Better Auth (Neon-native).
> All Supabase keys removed. This file documents the current required variables.

---

## Auth — Better Auth

```env
BETTER_AUTH_SECRET=     # openssl rand -hex 32 — server only, never client
BETTER_AUTH_URL=        # app base URL e.g. http://localhost:5173
```

No external auth service. Sessions stored in Neon `session` table.
`BETTER_AUTH_SECRET` is the only auth secret required.

---

## Design Tokens

### Decision: Warm off-white base, deep forest green primary, amber accent.

The palette is intentionally health-forward without being clinical.
Think farmers market, not hospital. Warm and grounded.

Tokens defined in `tailwind.config.ts` and CSS vars in `src/index.css`.
See `.claude/env-patch.md` history or `docs/architecture.md` for the
full palette specification.

---

## Stripe Price IDs

```env
STRIPE_PRICE_ID=price_live_xxx       # live mode — create in Stripe dashboard → Products
STRIPE_PRICE_ID_TEST=price_test_xxx  # test mode — separate price in Stripe test mode
```
