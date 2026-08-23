# Managiha — Implementation Status

**Audited:** 23 Aug 2026, against `docs/PRD.md` and `docs/lovable-prompt.md` (the build brief).
**Method:** full codebase grep/read verification, not memory. Every claim below was checked against the source. Gaps are listed, not hidden.

---

## 1. Verdict summary

| Area | Status |
|---|---|
| Auth (login, signup+store creation, forgot/reset) | ✅ Done |
| Layout (sidebar collapse/tooltips/localStorage, mobile drawer, topbar) | ✅ Done |
| Dashboard (4 KPIs, low-stock list, 2 feeds, 2 quick actions) | ✅ Done |
| Products (list, filters, pagination, quick-add, detail + history) | ✅ Done |
| Inventory (receive / adjust / history, RPC-only) | ✅ Done — now DB-enforced |
| Carnet (list, entry modal, detail, payment, WhatsApp link, RPC-only) | ✅ Done — now DB-enforced |
| Suppliers (list, add/edit/archive, linked count) | ✅ Done |
| Reports (4 exportable tables) | ✅ Done |
| Settings (store profile, DZD fixed, language, read-only plan) | ✅ Done |
| Database schema (8 tables, per PRD) | ✅ Done + hardening beyond PRD |
| RLS (per-operation policies, owner-derived) | ✅ Applied (verified live: policies present) |
| RPC functions (adjust_stock, record_carnet_transaction, get_dashboard_stats) | ✅ Done |
| DB-level enforcement of RPC-only stock/balance writes | ✅ Added in this audit (migration 00006) |
| Frontend test suite | ✅ 57 tests passing |
| SQL RLS/RPC integration suite | ✅ Written — **must be run manually** (see §5) |
| Product image upload UI | ❌ Not built (storage infra exists) |
| Rate limiting review | ❌ Relies on Supabase defaults only |
| Privacy policy / legal docs (Loi 18-07/25-11) | ❌ Not produced (PRD itself defers to counsel) |
| Backup/restore runbook | ❌ Not produced |
| Arabic/RTL functional | ❌ By design for v1 — structure ready, selector disabled |
| E2E browser tests / CI | ❌ Not built |

---

## 2. What exists, with evidence

### Auth
- `src/pages/auth/` — Login, Signup, ForgotPassword, ResetPassword, shared `AuthShell`.
- Signup passes `store_name`/`full_name` as metadata; **DB trigger** `handle_new_user` (migration 00002) creates `profiles` + `stores` with `owner_id = auth.uid()`. Client never inserts into `stores`.
- Reset uses `resetPasswordForEmail` with `redirectTo: <origin>/reset-password`; generic "email sent" message (does not reveal account existence).
- `AuthContext` gates the app on **session + profile/store loaded** (fixed race that crashed the dashboard), auto-refreshes the token and retries once on 401/403, and shows a diagnostic screen (with the server's error text + Retry/Logout) if the store row is missing.

### Layout
- `src/components/layout/Sidebar.tsx` — nav order: Tableau de bord, Produits, Stock, Carnet, Fournisseurs, Rapports; Paramètres pinned bottom, separated. Desktop: icon-only collapse with hover tooltips, persisted in `localStorage` (`managiha_sidebar_collapsed`). Mobile: overlay drawer, closes on navigation (effect on `location.pathname`).
- `Topbar.tsx` — page title from route + `ProfileMenu` (initials avatar, settings link, logout).

### Dashboard
- 4 KPI cards via `get_dashboard_stats()` RPC (server-side aggregation — no client math over partial pages): Valeur totale du stock, Produits en stock faible, Produits en rupture, Solde carnet total.
- Low-stock list from `products_overview` view (`stock_status in ('low','out')`) with per-row **Réceptionner** opening the receive modal prefilled.
- Recent movements feed (8) and recent carnet feed (8), signed quantities.
- Two quick actions ("Ajouter un produit", "Nouvelle entrée carnet") open modals — no navigation.

### Products
- List: server-side pagination (20/page, `count: exact`), debounced search on name/SKU/barcode, filters category/supplier/status/archived via `products_overview.stock_status` (security_invoker view — RLS applies).
- Quick-add/edit modal with all brief fields: name, category (create-on-type combo), unit (6 units, default piece), cost, sell, initial stock (recorded as an `opening_balance` **movement** via RPC — audit trail from birth), threshold, barcode (scanner-friendly text input), expiry, supplier.
- Detail: full editable form (stock intentionally **not** editable there), side summary card, movement history (last 50).

### Inventory
- Tabs Réceptionner / Ajuster / Historique (`?tab=` deep-linkable).
- Adjust requires a reason (comptage/dommage/vol/correction → mapped to movement types). Comptage/correction take the **new counted quantity**; the signed delta is sent to the RPC which owns the final math under row lock.
- **Every** write goes through `adjust_stock()` RPC. Verified by tests: no `products` insert/update calls exist in these code paths.

### Carnet
- Customer list with search, balance badges (text + color: "Doit X" / "À jour" / "Avance créditée"), last activity.
- Entry modal: pick-or-create customer, Crédit/Paiement, amount, note. New customer insert + RPC in sequence.
- Detail: big balance, "Enregistrer un paiement" (entry modal preset to payment), **WhatsApp share** (`wa.me` deep link with FR template including store name + balance — no API integration, per brief), edit modal, archive/restore.
- **Every** balance change goes through `record_carnet_transaction()` RPC.

### Suppliers / Reports / Settings
- Suppliers: table with phone/WhatsApp links, product counts via PostgREST aggregate embed, add/edit/archive.
- Reports: Stock faible, Valeur du stock (with totals), Mouvements par période (grouped summary), Carnet impayés — all CSV-exportable (UTF-8 BOM + `;` separators for FR Excel). History tab also exports.
- Settings: profile (name/phone), store (name/address/phone, currency **fixed DZD** read-only, language selector with Arabic present but disabled "Bientôt disponible"), read-only Plan section (Bêta gratuit / Actif).

### Database (migrations 00000–00006 + `all-in-one.sql`)
- Schema matches the PRD exactly (all 8 tables, checks, uniques, FKs) + indexes + `updated_at` triggers.
- RLS on all 8 tables; separate SELECT/INSERT/UPDATE policies; **no DELETE policy anywhere** (soft delete only). Ownership via `is_store_owner(store_id)` = the `exists (select 1 from stores where owner_id = auth.uid())` pattern.
- RPCs: `adjust_stock` (row lock → direction by type → signed delta for count/correction → rejects negative stock → update + movement in one txn), `record_carnet_transaction` (same pattern for balance), `get_dashboard_stats`.
- `products_overview` view (`security_invoker = true`) exposing computed `stock_status`.
- Storage bucket `product-images` (private) + store-scoped folder policies.
- **Added during this audit:**
  - `00005` — explicit grants to `authenticated` + `notify pgrst, 'reload schema'` (fixed the 403 privilege/cache incident).
  - `00006` — **guard triggers**: `products.current_stock` and `carnet_customers.balance` can no longer be written by an authenticated client at all — only via the RPCs (which run as definer). This upgrades the "never compute/write in the frontend" rule from convention to **database enforcement**.
  - `00004` — idempotent backfill for accounts created before the trigger existed.
  - `supabase/all-in-one.sql` — single idempotent paste-everything script (7 migrations concatenated).

---

## 3. PRD §8 Security checklist, item by item

| # | Requirement | Status |
|---|---|---|
| 1 | RLS on every table, explicit policies per operation | ✅ 22 policies, verified live in the project |
| 2 | Authorization from `auth.uid()`, never client `store_id` | ✅ `is_store_owner()` + `with check` on inserts |
| 3 | Cross-store access negative-tested | ✅ Suite written (`rls_rpc_tests.sql`) — ⚠️ **not yet executed against the live project** (see §5) |
| 4 | Storage scoped + policy-protected | ✅ Policies exist; ❌ no upload UI to exercise them |
| 5 | Service-role key never in client | ✅ Only anon key referenced (`supabaseClient.ts`) |
| 6 | Native auth only; reset doesn't leak account existence | ✅ |
| 7 | Rate-limit signup/login/reset | 🟡 Relies on Supabase platform defaults; the 3 launch toggles (SMTP, CAPTCHA, leaked-password) are documented in README 'Before going live' — no code to ship |
| 8 | Atomic mutations with required reason/type | ✅ RPCs atomic + row-locked; reason required in UI; DB enforces type/quantity validity |
| 9 | History immutable, corrections only | ✅ No UPDATE/DELETE policies on movements/transactions; asserted by test T19 |
| 10 | Carnet PII: minimum fields, export + delete capability | 🟡 Fields minimal (name/phone/notes) ✅, export ✅, **delete = archive only** — hard delete deliberately not built (build brief says "never hard delete"); PRD wants a deletion path for PII. **Open decision for the operator.** |
| 11 | Privacy policy (Loi 18-07 / 25-11) | ❌ Not produced — PRD itself requires counsel review |
| 12 | Backup/restore procedure | ❌ Not produced |

---

## 4. Honest gaps & deliberate deviations

**Gaps (not built):**
1. **Product image upload UI** — `image_path` column + private bucket + policies exist; no UI uploads or displays images. The build brief's form field list didn't include images; PRD architecture mentions storage.
2. **History pagination** — product movements capped at last 50, customer transactions at last 100; no load-more.
3. **Category management** — categories are created inline in the product form; no UI to rename/archive them (schema supports it).
4. **Rate limiting** — not tuned or documented (Supabase defaults apply).
5. **Legal** — no privacy policy, no records-of-processing doc, no backup/restore runbook.
6. **E2E/CI** — no Playwright suite; tests are not wired into any CI pipeline.

**Deliberate deviations from the letter of the PRD (all documented, none silent):**
1. **Signed quantities** — `stock_movements.quantity` and `carnet_transactions.amount` store signed values (+in/−out). The PRD/research explicitly left this open ("either approach is valid if enforced centrally"). Display formats the sign.
2. **Initial stock as a movement** — quick-add creates the product at stock 0 then logs an `opening_balance` movement via RPC, so `stock = f(movements)` holds from the first row. Two sequential calls (insert → RPC); if the RPC fails the product exists at 0 and can be received normally.
3. **Dashboard carnet total counts positive balances only** (amount actually owed); archived customers excluded.
4. **DB-enforced RPC-only writes** (migration 00006) goes *beyond* the brief — the brief said "all frontend writes must call these functions"; now nothing else *can* write those columns.
5. **i18n partial** — nav, labels, forms, toasts, empty states, statuses go through the dictionary (`src/i18n/`, RTL dir switching tested); a few composed confirmation sentences are inline French.

---

## 5. Tests — what really gets tested, and how to run them

### Frontend — `npm test` (vitest + Testing Library, jsdom)
**57 tests, 7 files, all passing.** These assert behavior and contracts, not smoke:

| File | What it actually verifies |
|---|---|
| `lib/__tests__/format.test.ts` (22) | DZD French formatting, signed quantities, Algerian phone → `wa.me` normalization (0→213, 00 prefix, junk → null), date formats, initials |
| `lib/__tests__/csv.test.ts` (7) | BOM for Excel accents, `;` separators, quote/semicolon/newline escaping, null handling |
| `lib/__tests__/stockStatus.test.ts` (7) | Boundary contract shared with the SQL view (0→Rupture, stock=threshold→Faible, null threshold→healthy) |
| `i18n/__tests__/i18n.test.ts` (6) | Key lookup, `{param}` interpolation, fallback, **dir=rtl switching** (Arabic readiness) |
| `products/__tests__/productForm.test.ts` (6) | Validation rules (name required, negative/non-numeric prices rejected, optionals optional) |
| `carnet/__tests__/CarnetEntryForm.test.tsx` (5) | **RPC-only contract**: credit → `record_carnet_transaction(p_type:'credit')`, payment → `payment`, amount parsing; new customer → insert + RPC against returned id; **asserts zero `update`/`delete` calls on `carnet_customers`**; empty amount blocked |
| `inventory/__tests__/AdjustStockForm.test.tsx` (4) | **RPC-only contract**: count → signed delta (new 7 on stock 10 → `p_quantity:-3`), damage/theft → positive removal quantities; **asserts zero `products` writes**; reason required before submit |

Testing the components found and fixed a real bug: `Select` labels weren't associated with their controls (missing `id`), an accessibility defect.

### Database — `supabase/tests/rls_rpc_tests.sql` (19 assertions)
Runs against the **real** database: creates two throwaway owners (`@managiha.test`), exercises RLS and RPCs under `set role authenticated` + JWT claims, then deletes everything (safe to re-run; wipes only its own test data).

**Status: EXECUTED against the live project — 19/19 passed.**

Covers: owner sees own store; **cross-store SELECT blocked (stores, carnet)**; **cross-store INSERT rejected**; anon sees nothing; receive/damage/count arithmetic incl. **signed delta**; negative-stock rejection; invalid type & zero qty rejection; **RPC on another owner's product rejected**; **direct client writes to `current_stock`/`balance` blocked by the guard triggers**; price edits still allowed (not over-blocked); hard DELETE does nothing (soft-delete enforced); **movement history append-only**; `products_overview` status at zero; `get_dashboard_stats` scoping.

**How to run (required — could not be executed from this machine):** the Supabase MCP connection here is bound to a *different* project (`jnunqilxiajinylgehuh...`, contains unrelated `fire_reports`/`sites` tables — not Managiha). So:

1. Open SQL Editor of the **Managiha** project (`wkgrczxflbptcyjzisxs`).
2. Paste `supabase/all-in-one.sql` → Run (idempotent; picks up migrations 00005 grants + 00006 guard triggers if you haven't applied them yet).
3. New query → paste `supabase/tests/rls_rpc_tests.sql` → Run.
4. Expect the results grid with **19 rows, all `passed = true`**, and the notice `MANAGIHA TESTS: all 19 passed`. If any row is `false`, the script raises a clear error naming the failures.

*Update: as of the last session, the SQL suite HAS been executed against the live project via the correctly-bound MCP — 19/19 passed, and the run also caught and drove the fix of a real guard-trigger bug (migration 00008) and an arithmetic race in count-adjustments (migration 00009).*

### Not tested (honest list)
- Real browser E2E flows (signup → confirm → login → full journey) — only component-level with a fake Supabase.
- Storage upload path (no UI exists).
- Load/performance, cross-browser, mobile devices.
- The SQL suite is manual — not wired into CI.

---

## 6. File-size constraint

All source files are under the ~250-line limit (largest: `SuppliersPage.tsx`, 239 lines). Verified by scan.
