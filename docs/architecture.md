# NutriApp — Architecture & Data Model

---

## Database — Neon + Drizzle

### Connection strategy
- **Runtime:** Neon HTTP driver via pooled connection (`DATABASE_URL`)
- **Migrations:** Neon direct connection (`DATABASE_URL_UNPOOLED`)
- **Branches:** `main` (prod), `dev` (development), `staging` (pre-deploy)
- **ORM:** Drizzle — all queries type-safe via schema inference

### Drizzle Schema (`src/lib/db/schema.ts`)

```ts
import {
  pgTable, uuid, text, timestamp, integer,
  real, jsonb, boolean, pgEnum
} from 'drizzle-orm/pg-core';

export const languageEnum = pgEnum('language', ['en', 'nl']);
export const themeEnum = pgEnum('theme', ['light', 'dark']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast','lunch','dinner','snack','drink']);
export const sourceEnum = pgEnum('source', ['manual','barcode','ai_parsed','imported']);
export const productSourceEnum = pgEnum('product_source', ['open_food_facts','usda','user','ai_estimated']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trial','active','comped','expired','cancelled']);
export const discountTypeEnum = pgEnum('discount_type', ['beta','influencer','timed']);
export const severityEnum = pgEnum('severity', ['info','suggestion','important']);

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  language: languageEnum('language').notNull().default('en'),
  theme: themeEnum('theme').notNull().default('light'),
  dateOfBirth: text('date_of_birth'),
  sex: text('sex'),
  acceptedTermsAt: timestamp('accepted_terms_at'),
  acceptedPrivacyAt: timestamp('accepted_privacy_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const foodLogEntries = pgTable('food_log_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  mealType: mealTypeEnum('meal_type'),
  date: text('date').notNull(),          // ISO date string YYYY-MM-DD
  parsedNutrients: jsonb('parsed_nutrients'),
  confidence: real('confidence'),
  source: sourceEnum('source').notNull().default('manual'),
  productId: uuid('product_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  barcode: text('barcode').unique(),
  name: text('name').notNull(),
  brand: text('brand'),
  nutritionalPer100g: jsonb('nutritional_per_100g').notNull(),
  servingSizeG: real('serving_size_g'),
  processingLevel: integer('processing_level'),  // 1-4
  source: productSourceEnum('source').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userCredits = pgTable('user_credits', {
  userId: uuid('user_id').primaryKey(),
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  convertedToPaidAt: timestamp('converted_to_paid_at'),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  amount: integer('amount').notNull(),    // negative = deduction
  action: text('action').notNull(),       // 'signup_grant' | 'ai_parse' | 'ai_tip' | 'purchase'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  userId: uuid('user_id').primaryKey(),
  status: subscriptionStatusEnum('status').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const discountCodes = pgTable('discount_codes', {
  code: text('code').primaryKey(),
  type: discountTypeEnum('type').notNull(),
  usesRemaining: integer('uses_remaining'),   // NULL = unlimited
  expiresAt: timestamp('expires_at'),         // NULL = no expiry
  trialDays: integer('trial_days'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const aiTips = pgTable('ai_tips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  timeframeDays: integer('timeframe_days').notNull(),
  nutrientsFlagged: text('nutrients_flagged').array(),
  tipTextEn: text('tip_text_en').notNull(),
  tipTextNl: text('tip_text_nl').notNull(),
  severity: severityEnum('severity').notNull().default('suggestion'),
  dismissedAt: timestamp('dismissed_at'),
});

export const chatbotSessions = pgTable('chatbot_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  ipHash: text('ip_hash').notNull(),
  userId: uuid('user_id'),               // NULL if anonymous
  messagesToday: integer('messages_today').notNull().default(0),
  date: text('date').notNull(),          // YYYY-MM-DD
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const unansweredQuestions = pgTable('unanswered_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  question: text('question').notNull(),
  language: languageEnum('language').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## Nutrients JSON Shape

Used in `parsed_nutrients` and `nutritional_per_100g` jsonb columns:

```ts
type NutrientProfile = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  saturated_fat_g: number;
  fibre_g: number;
  sugar_g: number;
  salt_g: number;
  vitamins: {
    vitamin_a_mcg?: number;
    vitamin_c_mg?: number;
    vitamin_d_mcg?: number;
    vitamin_b12_mcg?: number;
    folate_mcg?: number;
  };
  minerals: {
    calcium_mg?: number;
    iron_mg?: number;
    magnesium_mg?: number;
    zinc_mg?: number;
    potassium_mg?: number;
  };
};
```

---

## API Surface (Hono Routes)

All routes under `src/api/`, served at `/api/` via Vercel Edge Functions.

| Route | Method | Auth | Rate Limit | Credits | Description |
|-------|--------|------|-----------|---------|-------------|
| `/api/food-log` | GET | ✅ | 60/min | 0 | Get food log entries |
| `/api/food-log` | POST | ✅ | 60/min | 0 | Add manual entry |
| `/api/ai/parse-food` | POST | ✅ | 10/min | 1 | AI parse text entry |
| `/api/ai/generate-tips` | POST | ✅ | 5/hour | 2 | Generate nutrition tips |
| `/api/ai/chat` | POST | Optional | 5/day (anon) | 0 | FAQ-first chatbot |
| `/api/barcode/lookup` | GET | ✅ | 30/min | 0 | Barcode product lookup |
| `/api/products` | POST | ✅ | 10/min | 0 | Register product |
| `/api/payments/checkout` | POST | ✅ | 10/hour | 0 | Create Stripe session |
| `/api/payments/webhook` | POST | Stripe sig | — | 0 | Handle Stripe events |
| `/api/payments/discount` | POST | ✅ | 10/hour | 0 | Validate + apply code |
| `/api/contact` | POST | None | 3/hour/IP | 0 | Send contact email |
| `/api/credits` | GET | ✅ | 60/min | 0 | Get credit balance |

---

## Credit Costs

| Action | Cost |
|--------|------|
| Manual food entry | 0 |
| AI food parse | 1 |
| AI tip generation | 2 |
| Barcode lookup | 0 |
| Chatbot message | 0 |

**Initial free grant on signup:** 50 credits, expires 30 days after signup.

---

## Caching Strategy (Upstash Redis)

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Open Food Facts product | 7 days | `off:barcode:{barcode}` |
| USDA ingredient | 30 days | `usda:id:{fdcId}` |
| AI food parse (same input hash) | 1 hour | `parse:{sha256(description)}` |
| User credit balance | 30 sec | `credits:{userId}` |

---

## Query Scoping Pattern

Every query for user-owned data must filter by `userId` from auth context.
Never accept userId from request body or query params.

```ts
// ✅ userId from auth middleware — cannot be spoofed
const userId = c.get('userId');
const entries = await db
  .select()
  .from(foodLogEntries)
  .where(eq(foodLogEntries.userId, userId));

// ❌ userId from request — can be spoofed by client
const { userId } = await c.req.json();
```
