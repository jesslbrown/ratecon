# CLAUDE.md

Read this before changing anything. Future-Claude: this is your operating
manual for RateCon.

## Stack & structure conventions

- Next.js 15 App Router, React Server Components by default. Reach for
  `'use client'` only when you need interactivity (forms, dropzones, dialogs).
- TypeScript strict + `noUncheckedIndexedAccess`. Zero `any` — the lint rule
  enforces this.
- Tailwind + shadcn/ui. Add new primitives via `pnpm dlx shadcn@latest add <name>`.
- Server Actions live in `app/.../actions.ts` and are used for mutations from
  forms. API routes are reserved for webhooks and AI calls (where streaming /
  multi-content-type matters).

### Where to add new features

| Feature kind | Location |
| --- | --- |
| New marketing page | `app/(marketing)/<slug>/page.tsx` |
| New authenticated page | `app/(app)/<slug>/page.tsx` (read profile via `createClient()` from `lib/supabase/server`) |
| New mutation | Server action in `app/(app)/<slug>/actions.ts` (validate with Zod, no side effects without auth check) |
| New AI call | API route under `app/api/<feature>/route.ts` + module under `lib/anthropic/` |
| New webhook | API route under `app/api/<provider>/webhook/route.ts` with idempotency table |
| Reusable UI primitive | `components/ui/` |
| Composed form / flow | `components/forms/` |
| Cross-cutting layout shell | `components/shared/` |
| Pure logic / utilities | `lib/<topic>/` |

### Naming conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`. Co-locate tests as `*.test.ts`.
- Components: `PascalCase`, default-exported only when they're an App Router
  page or layout. Otherwise named exports.
- Zod schemas: `<name>Schema`, types: `<Name>` (e.g. `loadInputSchema` →
  `LoadInput`).
- Database columns: `snake_case`. The TS row types reflect this — don't
  rename in the app layer.

### File size limit

Hard cap of **250 lines** per file. If you're approaching it, split:

- Page → page + `components/forms/<name>-form.tsx`
- Long Zod schema → multiple sibling files in `lib/validators/`
- Big API handler → handler + `lib/<topic>/<helper>.ts`

### Code style

- Comments explain **why**, never **what**. The compiler shows what.
- No commented-out code in commits. If you might want it later, it's in git
  history.
- Validate at every boundary: API routes, server actions, webhooks. Trust
  internal calls.
- Prefer `Promise.all` for independent reads. Don't await sequentially when
  parallel is correct.

## Rate-con extraction prompt

The extraction module is `lib/anthropic/extraction.ts`. The prompt itself is
isolated in `lib/anthropic/prompt.ts` so it lives in source control alongside
the Zod schema in `lib/validators/rate-con.ts`.

**Invariants:**

1. The system prompt forbids invented values — the model returns `null` for
   unknown fields. The Zod schema reflects this.
2. The model **must** be Sonnet at runtime — never Opus. Opus is too
   expensive for high-volume extraction. The model is read from
   `ANTHROPIC_MODEL` so future model upgrades happen via env, not code.
3. Inputs are capped at 10MB and we retry transient API failures up to 3
   times. Parse failures are surfaced immediately with the raw response so
   you can debug.

**Evolving the prompt:**

- The user-facing schema must stay in lockstep with `rate-con.ts`. If you
  add a field to one, add it to the other in the same commit.
- Anonymized usage logs go through `logExtraction()`. Forward those to a
  Supabase audit table or PostHog when you're ready to measure accuracy.
- After extraction, the user **always** lands on a confirmation screen
  where every field is editable. Don't bypass this — autonomous extraction
  is for analytics, not for trust.

## Database migration workflow

```bash
supabase migration new <name>             # creates supabase/migrations/<ts>_<name>.sql
# edit the file
supabase db reset                          # rebuilds local db with all migrations
pnpm db:types                              # regenerates database.types.ts
```

Production migrations are applied by pushing to a Supabase project linked via
`supabase link` — outside the scope of this scaffold.

**RLS rules:** every user-data table enforces `auth.uid() = user_id` (or
`= id` for `profiles`). When adding a new table, add the policies in the
same migration. The `subscriptions` table is read-only for users; only the
service role writes to it (via Stripe webhook).

## Testing conventions

- Vitest, jsdom environment. Setup file is `vitest.setup.ts`.
- Pure logic gets unit tests. The tax module is the gold standard —
  `lib/tax/canadian-tax.test.ts` covers every CRA rule.
- Components and forms can use `@testing-library/react`. Don't bother
  testing trivial markup — focus on state transitions and error paths.
- Money-touching code (tax, invoice totals, Stripe webhook handlers) **must**
  ship with tests. No exceptions.

## Model selection guidance

When asking Claude for help with this codebase:

- **Opus 4.7** — architecture decisions, refactors that touch multiple
  modules, the tax module, billing/Stripe logic, anything where correctness
  > throughput.
- **Sonnet 4.6** — routine feature work (new pages, new API routes,
  expanding existing forms). Also the runtime extraction model — never swap
  to Opus there.
- **Haiku 4.5** — trivial scaffolding, renaming, mechanical edits. Don't use
  it for anything where understanding the system matters.

## Things to never do

- Never add features beyond the spec without writing them down first. ELD,
  factoring, fleet mode are phase 2 — keep them out of phase 1.
- Never use the service-role Supabase key in any path reachable from a
  browser request. RLS exists for a reason.
- Never trust extracted JSON without Zod validation.
- Never commit `.env.local` or any file containing real keys.
