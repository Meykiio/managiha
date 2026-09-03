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
npm test           # vitest run (74 tests)
```

## Architecture rules (enforced by tests — do not bypass)

1. **RPC-only writes.** `products.current_stock` and `carnet_customers.balance` are changed exclusively by the Postgres functions `adjust_stock()` and `record_carnet_transaction()`. The database (guard triggers, migrations 00008) blocks any direct authenticated write. Never compute final stock/balance in the frontend.
   - `adjust_stock` semantics: `receive`/`return`/`opening_balance` = +qty; `sale`/`damage`/`theft` = -qty (positive input); `count_adjustment` = **absolute new counted quantity** (delta computed server-side under row lock); `correction` = signed delta. `count_adjustment` refuses negative stock results.
   - `record_carnet_transaction`: `credit` adds, `payment` subtracts, `adjustment` signed; overpayment is allowed (negative balance = advance, by design).
2. **Soft-delete only** (`archived_at`) for products/categories/suppliers/carnet customers. No hard delete anywhere.
3. **History is immutable** — no UPDATE/DELETE policies on `stock_movements` or `carnet_transactions`; corrections go through new movements.
4. **i18n.** Trilingual: French (default), Arabic (MSA, RTL), English. All UI strings go through `src/i18n/` via `t("key")` — never inline a literal in a component, including `placeholder`, `aria-label`, validation messages, and CSV headers.
   - Every key must exist in all three languages: `fr-core`/`fr-pages`, `ar-core`/`ar-pages`, `en-core`/`en-pages`. The `ar.ts`/`en.ts` aggregators are typed `Record<TranslationKey, string>`, so a missing key fails `typecheck`, and `i18n.test.ts` asserts parity both ways.
   - `t()` resolves at render time and `App.tsx` keys the routed subtree on the active language, so switching remounts and re-translates everything. Use `useLanguage()` only for UI that must re-render outside that subtree.
   - Never hardcode a locale in a formatter: `src/lib/format.ts` reads `getLocale()`. Arabic is pinned to `ar-DZ-u-nu-latn-ca-gregory` (Latin digits, Gregorian calendar) to match Algerian price tags and invoices.
   - Layout uses logical CSS properties (`ps-*`/`me-*`/`start-*` / `end-*`) — keep RTL-safe, and confirm Arabic sets `dir="rtl"`.
5. **File size ≤ ~250 lines.** Split components; `Pagination`, `Tabs`, `Modal`, `Card`, `EmptyState` are the UI kit.

## Patterns

- Pages live in `src/pages/*`, shared components in `src/components/*`, data access in `src/lib/api.ts` + `src/lib/supabaseClient.ts`.
- Server-side pagination: `PAGE_SIZE = 20` from `src/lib/constants.ts`, `count: "exact"`, `.range()`.
- Load pattern: `useCallback` loader + `useEffect` + loading/empty/error states (no react-query).
- Badges: text + color dot (`<Badge tone={...} dot>`), never color alone.
- Numeric inputs: `suffix="DZD"`; monetary display via `fmtMoney*` in `src/lib/format.ts` (French grouping, tnum).
- Toasts for every save via `useToast()`.

## Database

- Migrations: `supabase/migrations/` (00000–00009, applied in order; `supabase/all-in-one.sql` = idempotent concatenation).
- RLS: per-operation policies, ownership via `is_store_owner(store_id)` (the `exists (select 1 from stores where owner_id = auth.uid())` pattern). `stores` INSERT is restricted to `owner_id = auth.uid()`; profile/store rows are created by the `handle_new_user` trigger on `auth.users` — the client never inserts into `stores`.
- Reporting: `products_overview` view (security_invoker) exposes `stock_status` (`healthy`/`low`/`out`); dashboard stats via `get_dashboard_stats()` RPC.
- Storage: private bucket `product-images`, paths `{storeId}/...`, store-scoped policies.

## Verification

- Before finishing any task: `npm run typecheck` + `npm test` (must stay 74/74 green).
- After schema/RPC changes: run `supabase/tests/rls_rpc_tests.sql` in the SQL Editor of a test project (19 assertions; it self-cleans). Rules of thumb: files with UTF-8 content must never be rewritten with PowerShell 5.1 `Get-Content`/`Set-Content` (encoding corruption); use the Write/Edit tools or Node scripts.
- Commit after each meaningful phase (repo convention: conventional commits, e.g. `fix(guard): split per-table triggers`).

## Out of scope (never add without being asked)

POS/checkout, fiscal invoicing, staff roles, multi-store, CSV import, offline sync, billing UI, decorative charts, product-image upload (UI pending), any hard-delete affordance, and additional languages beyond fr/ar/en (each new one must be complete, not partial).
