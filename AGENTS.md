# AGENTS.md — Managiha

Guidance for AI agents working in this repository.

## Project

French-first web platform for Algerian mini-market owners: product stock + customer credit tabs (`carnet`). Single owner per store, DZD currency. Open-source reference project.

## Stack

- **App:** React 18 + TypeScript + Vite + Tailwind CSS + react-router-dom v6 + lucide-react. No other runtime deps.
- **Backend:** Supabase (Auth PKCE, Postgres + RLS, Storage for product images).
- **Tests:** Vitest + Testing Library (jsdom).

## Commands

```bash
npm run dev        # dev server
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (max-lines 250 + jsx-a11y)
npm run gate       # lint + typecheck + test + build  <- run before committing
npm run gate:all   # gate + Playwright/axe E2E + knip
npm test           # vitest run (134 tests)
```

## Architecture rules (enforced by tests — do not bypass)

1. **RPC-only writes.** `products.current_stock`, `product_lots.quantity` and `carnet_customers.balance` are changed exclusively by the Postgres functions `adjust_stock()`, `checkout_sale()` and `record_carnet_transaction()`. The database (guard triggers, migrations 00008 and 00016) blocks any direct authenticated write. Never compute final stock/balance in the frontend.
   - `adjust_stock` semantics: `receive`/`return`/`opening_balance` = +qty; `sale`/`damage`/`theft` = -qty (positive input); `count_adjustment` = **absolute new counted quantity** (delta computed server-side under row lock); `correction` = signed delta. `count_adjustment` refuses negative stock results.
   - **Parameter order is load-bearing.** `p_client_op_id` is the 7th parameter of `adjust_stock`; lot parameters (`p_lot_id`, `p_expiry_date`, `p_lot_code`) are appended *after* it. Never insert a parameter before `p_client_op_id`, and drop the old overload when the signature changes or PostgREST lookup becomes ambiguous.
   - `record_carnet_transaction`: `credit` adds, `payment` subtracts, `adjustment` signed; overpayment is allowed (negative balance = advance, by design).
   - `product_lots` has a SELECT policy and **no write policy at all**. Lots change only inside the two RPCs. `products.current_stock` always equals the sum of its lots' quantities.
2. **Soft-delete only** (`archived_at`) for products/categories/suppliers/carnet customers. No hard delete anywhere.
3. **History is immutable** — no UPDATE/DELETE policies on `stock_movements` or `carnet_transactions`; corrections go through new movements.
4. **i18n.** All UI strings go through `src/i18n/` via `t("key")`. French is the reference locale in `src/i18n/locales/fr/`; other locales are typed `Record<TranslationKey, string>`, so a missing key fails typecheck. Nine domains per locale. Layout uses logical CSS properties (`ps-*`/`me-*`/`start-*`/`end-*`) — keep RTL-safe, and check `document.documentElement.dir` in any keyboard-navigation handler.
   - **Never call `t()` at module scope.** It resolves against module state when called, so a module-level `t()` freezes the language at import. `src/i18n/__tests__/architecture.test.ts` fails the build on this.
   - Never put a translated label on a data structure in `src/lib/`. Carry a `TranslationKey` and resolve it at render, the way `src/lib/constants.ts` does.
5. **File size ≤ 250 lines, enforced by ESLint `max-lines`.** Split components; `Pagination`, `Tabs`, `Modal`, `Card`, `EmptyState` are the UI kit.

## Patterns

- Pages live in `src/pages/*`, shared components in `src/components/*`.
- Data access: **reads** in `src/lib/api.ts`, **write RPCs** in `src/lib/rpc.ts` (re-exported from api.ts), **lot reads** in `src/lib/lots.ts`, client in `src/lib/supabaseClient.ts`.
- Server-side pagination: `PAGE_SIZE = 20` from `src/lib/constants.ts`, `count: "exact"`, `.range()`.
- Load pattern: `useCallback` loader + `useEffect` + loading/empty/error states (no react-query).
- Badges: text + color dot (`<Badge tone={...} dot>`), never color alone.
- Numeric inputs: `suffix="DZD"`; monetary display via `fmtMoney*` in `src/lib/format.ts` (French grouping, tnum).
- Toasts for every save via `useToast()`.

## Database

- Migrations: `supabase/migrations/` (00000–00024, applied in order; `supabase/all-in-one.sql` = idempotent concatenation, identical to `master-schema.sql`). Regenerate with `npm run db:bundle` after any migration change.
- RLS: per-operation policies, ownership via `private.is_store_owner(store_id)` — note the `private` schema, **not** `public` (migration 00014 moved the helpers). `stores` INSERT is restricted to `owner_id = auth.uid()`; profile/store rows are created by the `handle_new_user` trigger on `auth.users` — the client never inserts into `stores`.
- Reporting: `products_overview` view (security_invoker) exposes `stock_status` (`healthy`/`low`/`out`); `expiry_report` view lists open lots with `value_at_risk`; dashboard stats via `get_dashboard_stats()` RPC.
- Storage: private bucket `product-images`, paths `{storeId}/...`, store-scoped policies.

## Verification

- Before finishing any task: `npm run gate` (lint + typecheck + 134 tests + build).
- After schema/RPC changes: run all six SQL suites in the SQL Editor of a test project — `rls_rpc_tests.sql` (21), `checkout_rpc_tests.sql` (16), `product_lots_tests.sql` (17), `trends_rpc_tests.sql` (11), `legal_rpc_tests.sql` (12), `insights_rpc_tests.sql` (19). **96 assertions, all passing against PostgreSQL 17.11.** They self-clean. Running them is how defects were found that four rounds of review had missed, including a sale that recorded no price and so earned nothing — treat them as a real gate and not a formality.
- Before finishing a phase: `npm run gate:all` (gate + Playwright/axe E2E + knip). The E2E suite asserts zero axe violations on every public route in **both themes** and in RTL.
- **Trigger functions must live in `private`.** A `SECURITY DEFINER` function in `public` is published as an RPC endpoint; `handle_new_user` and `set_updated_at` were exposed until 00017 moved them. Supabase's security advisor flags this.
- `product_lots` needs `NULLS NOT DISTINCT` on its unique constraint. Without it an unlabelled lot never collides, so `ON CONFLICT` inserts a duplicate row per receipt.
- **Never put an optional parameter after a parameter that has no default.** Postgres rejects the entire function with `42P13`, which is how `checkout_sale` failed to install at all.
- **A PL/pgSQL `FOR` loop evaluates its query once.** A `where <loop variable> > 0` predicate does not stop it mid-iteration; use `exit when` inside the body. This caused zero-quantity movements to be written.
- Rules of thumb: files with UTF-8 content must never be rewritten with PowerShell 5.1 `Get-Content`/`Set-Content` (encoding corruption); use the Write/Edit tools or Node scripts. The PowerShell console also cannot render `é`, `œ` or Arabic — verify with Node, never trust console output.
- Commit after each meaningful phase (repo convention: conventional commits, e.g. `fix(guard): split per-table triggers`).

## Out of scope (never add without being asked)

**Product boundary: Managiha is a back-office tool, not a point of sale.** Never add fiscal invoicing (DE 05-468), card payments, thermal fiscal tickets, staff roles, multi-store, or billing. Reason: from 2027-01-01 Algerian businesses using a "système de caisse" must hold an inaltérabilité attestation we cannot certify. See `docs/PROJECT.md`.

Also out of scope: CSV import, decorative charts, Arabic as a *functional* language (structure only), and any hard-delete affordance.

Product image upload is **built** (`ProductImageUpload.tsx`).

Two scan flows exist and are **different jobs, not duplicates**: `src/pages/ScannerPage.tsx` (sell at the counter, cart + payment, route `/scanner`) and the receive flow planned for Phase 4 (goods arriving, quantity + lot capture, no cart). Shared barcode logic lives in `src/hooks/useBarcodeLookup.ts`. Never re-introduce a second sell flow.

Offline sync and `product_lots`/FEFO are **planned** (Phases 2-3), not yet built.

## Read first

`docs/PROJECT.md` has the current state, the known-issues list ordered by severity, and the roadmap. The defects it once warned about are fixed and verified; the file records what each one was and the test that now prevents its return, so read it before assuming a described bug is still open.

`docs/DATABASE.md` is the reference for the schema, the write RPCs and the traps that have actually bitten. Read it before touching anything under `supabase/`.

### Docs map

| File | Use it for |
|---|---|
| `docs/PROJECT.md` | Current state, known issues, what is deliberately unbuilt |
| `docs/DATABASE.md` | Schema, RLS, RPC semantics, parameter-order traps |
| `docs/FEATURES.md` | What each screen does and why |
| `docs/PROJECT_STRUCTURE.md` | Where code lives; the rules for `src/lib/` |
| `docs/DEPLOY.md` | Supabase setup, env, hosting, go-live |
| `docs/DESIGN-SYSTEM.md` | Tokens and component rules |
| `docs/OFFLINE.md` | What is queued and what is not, and why |
| `docs/LEGAL.md` | Loi 18-07 position and open legal questions |
| `docs/TOOLING.md` | Tools adopted and declined, with reasons |
| `docs/archive/` | Historical: research, the original PRD, audits. Not current |

`README.md` (English) and `README.ar.md` (Arabic) are the public entry points and
are kept in step with each other. Changing one means changing both.
