# RateCon

AI-powered invoicing for Canadian owner-operator truckers. Snap a photo of a
freight rate confirmation, AI extracts the load details, and the app generates
a branded PDF invoice that's emailed to the broker — all in under 60 seconds.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS** + **shadcn/ui** (slate base color)
- **Supabase** — Postgres, auth (magic link + Google OAuth), private storage
- **Stripe** — subscriptions ($29 Solo, $49 Plus, 14-day trial)
- **Anthropic SDK** — Claude Sonnet 4.6 vision for runtime extraction
- **Resend** — transactional email
- **React-PDF** — invoice PDF generation
- **next-intl** — i18n (en, pa, hi, ur)
- **Zod** + **React Hook Form** + **TanStack Query**
- **Vitest** for unit tests

Built and tested against:

- Node `>= 20.11` (developed on Node 22.22)
- pnpm `>= 10` (npm and yarn also work)

## Architecture overview

```
app/
  (marketing)/    Public site: landing, pricing, about
  (auth)/         Magic-link sign-in, Google OAuth
  (app)/          Authenticated layout w/ sidebar
    dashboard/    KPIs (unpaid, this month, overdue)
    invoices/     List, /new (magic-moment flow), /[id]
    brokers/      Broker contact book
    settings/     Company, tax, language, billing
  api/
    extract-ratecon/  POST: image/PDF → structured JSON via Claude vision
    invoices/         CRUD
    send-invoice/     Render PDF, email via Resend
    stripe/checkout/  Create checkout session
    stripe/webhook/   Idempotent webhook receiver
components/
  ui/              shadcn primitives
  forms/           Sign-in, profile, invoice flow, billing
  invoice-pdf/     React-PDF templates
  shared/          Header, sidebar, language switcher, onboarding
lib/
  anthropic/       Extraction prompt + client + Zod parsing
  stripe/          Client, checkout, webhook handlers, gate
  supabase/        client.ts (browser), server.ts (RSC), middleware.ts
  resend/          Client + send-invoice
  pdf/             React-PDF render helper
  tax/             Canadian GST/HST calc (heavily tested)
  validators/      Zod schemas (rate-con, load, profile)
  storage/         Supabase Storage path helpers
i18n/              next-intl routing + request config
messages/          Locale JSON files (en canonical)
supabase/
  migrations/      Initial schema + RLS
  config.toml      Local dev config
```

## Local development setup

You need:

- Node 20+ (we use 22)
- pnpm 10
- Supabase CLI (`brew install supabase/tap/supabase` or equivalent)
- Stripe CLI for webhook forwarding (`brew install stripe/stripe-cli/stripe`)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — from `supabase status` after `supabase start`
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe test keys
- `STRIPE_WEBHOOK_SECRET` — printed by `stripe listen` (see step 4)
- `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_PLUS` — Stripe price IDs you create
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — from resend.com

### 3. Apply Supabase migrations

```bash
supabase start
supabase db reset            # applies migrations + seed.sql
pnpm db:types                # regenerates lib/supabase/database.types.ts
```

To create a new migration:

```bash
supabase migration new <name>
# edit supabase/migrations/<timestamp>_<name>.sql
supabase db reset
```

### 4. Start the Stripe webhook listener

```bash
pnpm stripe:listen
```

Copy the printed `whsec_…` secret into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### 5. Run the app

```bash
pnpm dev
```

Open http://localhost:3000.

## Testing

```bash
pnpm test           # one-shot
pnpm test:watch     # watch mode
pnpm typecheck      # tsc --noEmit
pnpm lint
```

Tests live next to the modules they cover, e.g.
`lib/tax/canadian-tax.test.ts`. New AI- or money-touching code **must** ship
with Vitest tests.

## Stripe webhook testing

Stripe forwards events to your local server via `pnpm stripe:listen`. Useful
fixtures:

```bash
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger checkout.session.completed
```

Webhooks are idempotent — events are deduped by `event.id` in the
`stripe_events` table.

## Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | server + client | Public origin for redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | both | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Bypasses RLS — webhooks only |
| `ANTHROPIC_API_KEY` | server | Anthropic API |
| `ANTHROPIC_MODEL` | server | Pinned to `claude-sonnet-4-6` |
| `STRIPE_SECRET_KEY` | server | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | server | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | both | Stripe.js |
| `STRIPE_PRICE_SOLO` | server | Solo plan price ID |
| `STRIPE_PRICE_PLUS` | server | Plus plan price ID |
| `RESEND_API_KEY` | server | Resend API |
| `RESEND_FROM_EMAIL` | server | Verified sending address |

## Deploying

Not covered here — production deploy is intentionally out of scope for the
scaffold. When ready, target Vercel + Supabase Cloud and use Stripe live keys.
