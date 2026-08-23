# PRD — Mini Market Stock & Carnet Platform (Algeria)

Synthesized from Claude, Perplexity, and cross-checked assumptions research. ChatGPT's report was off-topic (unrelated AI-adoption survey) and excluded.

## 1. Product Summary

A simple, French-first web platform for Algerian mini market owners to manage **product stock** and **customer credit tabs ("carnet")** in one place. Single owner per store. Clean, modern SaaS dashboard with a collapsible sidebar. No POS, no fiscal invoicing, no multi-store, no staff roles in v1.

**Positioning**: a digital replacement for the notebook — not an accounting suite, not a POS system, not GestiumPRO. The two features that make it worth switching from paper: stock visibility (what's low, what's worth) and carnet (who owes what, with WhatsApp-friendly reminders).

**Why carnet is in v1 (deliberate scope call, not default)**: independent research found real, currently-used single-purpose apps (Karnet, Carnet de Dettes) solving this exact problem for this exact market — stronger validation than exists for pure inventory alone. Combining carnet + stock in one product is the differentiated wedge; no direct competitor was found doing both. This is accepted as a scope decision with a real cost: carnet introduces third-party PII (customers' data), which raises the security/compliance bar above a pure single-owner inventory tool. See Section 8.

## 2. Non-Goals (v1)

- No POS / checkout / fiscal invoicing (Algeria's 2027 cash-register certification law is a real future constraint — do not build anything that looks like a certified till).
- No multi-store, no staff accounts/roles.
- No online card billing — manual activation only (BaridiMob/CCP transfer, confirmed manually).
- No purchase orders, no batch/expiry-lot management (a simple optional expiry date field is fine).
- No offline-sync engine — Algeria's connectivity (79.5% internet penetration, ~53 Mbit/s mobile) doesn't require it. Standard loading/retry states are enough.

## 3. Personas (research hypotheses, not interview-validated)

- **Karim** — 35–50, owner-operator, 300–1,000 SKUs, tracks stock by memory + notebook, orders by phone/WhatsApp, likely Android-first.
- **Nadia** — 25–45, busier shop with an assistant, 700–2,000 SKUs, wants to separate sales/damage/theft/adjustment causes and spot shrinkage.

Both plausibly already run an informal carnet in a physical notebook — this is the second half of the same daily habit stock-tracking is meant to replace.

## 4. Information Architecture / Sitemap

**Auth**
- Login
- Sign up
- Forgot / reset password

**Main app (sidebar nav, 6 items)**
1. Dashboard
2. Products
3. Inventory (stock movements: receive, adjust, history)
4. Carnet (customers, balances, payments)
5. Suppliers
6. Reports

Settings lives at the bottom of the sidebar, outside the main 6.

| Page | Purpose |
|---|---|
| Dashboard | KPI cards + low-stock list + recent activity + quick actions |
| Products (list) | Search/filter/add/edit/archive catalog |
| Product detail | Info + stock movement history for that product |
| Inventory / Receive stock | Add incoming quantities, optional supplier link |
| Inventory / Adjust stock | Correct quantity, reason required (damage/theft/count/correction) |
| Inventory / Movements | Full history log, filterable |
| Carnet / Customers | List of customers with running balance |
| Carnet / Customer detail | Transaction history (credit given, payments received), record payment, send WhatsApp reminder link |
| Suppliers | Name, contact, linked products |
| Reports | Low stock, stock value, movement summary, carnet outstanding total |
| Settings | Store profile, currency (DZD fixed), language, plan/status placeholder |

## 5. Dashboard KPI Cards (max 4–5, no decorative charts)

1. Total stock value
2. Low-stock item count
3. Out-of-stock item count
4. Total outstanding carnet balance (amount owed to the store)

Below cards: low-stock list with "Receive stock" quick action, recent stock movements, recent carnet activity, and a floating/prominent "Add product" + "New carnet entry" quick action pair.

## 6. Data Model

Single Supabase project. Every business table carries `store_id`. RLS derives access from `auth.uid()` via `stores.owner_id`, never from a client-supplied `store_id`.

```sql
profiles (
  id uuid primary key references auth.users(id),
  full_name text, phone text,
  created_at timestamptz, updated_at timestamptz
)

stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null, address text, phone text,
  currency char(3) not null default 'DZD',
  language text not null default 'fr',
  timezone text not null default 'Africa/Algiers',
  created_at timestamptz, updated_at timestamptz
)

categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null, archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  unique(store_id, name)
)

suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null, phone text, whatsapp text, address text, notes text,
  archived_at timestamptz, created_at timestamptz, updated_at timestamptz
)

products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  category_id uuid references categories(id),
  supplier_id uuid references suppliers(id),
  name text not null, sku text, barcode text,
  unit text not null default 'piece',
  cost_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  current_stock numeric(12,3) not null default 0,
  low_stock_threshold numeric(12,3),
  expiry_date date,
  image_path text,
  active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  unique(store_id, sku), unique(store_id, barcode)
)

stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  movement_type text not null check (movement_type in
    ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance')),
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2), reason text, note text,
  created_by uuid references auth.users(id),
  created_at timestamptz
)

-- CARNET (net-new vs. pure-inventory scope)
carnet_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  full_name text not null,
  phone text,
  notes text,
  balance numeric(12,2) not null default 0,  -- positive = customer owes store
  archived_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)

carnet_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  customer_id uuid not null references carnet_customers(id),
  type text not null check (type in ('credit','payment','adjustment')),
  amount numeric(12,2) not null,  -- credit increases balance, payment decreases it
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz
)
```

**Stock strategy**: `products.current_stock` is a stored, fast-read field, updated only via a transactional Postgres function alongside the `stock_movements` insert (lock row → validate → update → insert → commit). Never let the client compute and write final stock quantity.

**Carnet strategy**: same pattern — `carnet_customers.balance` is a stored running total, updated only via a transactional function alongside the `carnet_transactions` insert. Never let the client write balance directly.

**Soft-delete everywhere**: products, categories, suppliers, carnet_customers use `archived_at`, never hard delete.

## 7. Architecture

| Concern | Decision |
|---|---|
| Frontend | React + TypeScript + Tailwind |
| Backend | Supabase (Auth, Postgres, Storage) |
| Tenancy | Single project, RLS keyed to `stores.owner_id = auth.uid()` |
| Stock/carnet mutations | Postgres RPC functions only — never client-side arithmetic |
| Realtime | Not required for v1 (single owner) |
| Images | Supabase Storage, store-scoped paths + policies |
| Offline | Standard loading/retry/optimistic-UI only — no offline sync engine |
| Deploy | Vercel (frontend), Supabase (backend) |
| Billing | No online billing in v1 — Settings shows plan/status as a manually-updated placeholder |

## 8. Security & Compliance (non-negotiable for v1, elevated because of carnet)

1. RLS enabled on every table, explicit policies per operation (select/insert/update/delete) — not one blanket policy.
2. Authorization always derived from `auth.uid()` server-side; never trust a client-supplied `store_id`.
3. Cross-store access negative-tested before anything resembling a launch.
4. Storage buckets scoped and policy-protected per store — no public product-image bucket.
5. Service-role key never in client code.
6. Supabase Auth only for sessions/password reset — no custom auth handling. Password-reset flow must not reveal whether an email exists.
7. Rate-limit signup/login/reset endpoints.
8. Stock and carnet mutations are atomic (Postgres functions), with a required `reason`/`type` on every write.
9. Movement and transaction history is immutable — no editing past records, only new correcting entries.
10. **Carnet-specific**: this is third-party PII (customers' names, phone numbers, debts) held by the store owner. Minimum fields only (name, phone, notes — no ID numbers, no extra profiling). Provide export and delete-customer-record capability from day one. Note in privacy policy that the store owner is the data controller for carnet entries; the platform is a processor.
11. Data protection law reference: the correct citation is **Loi n° 25-11** (which amends the earlier 18-07 framework) — Claude's initial "could not verify" note is resolved; Perplexity's research confirms 25-11 is current as of July 2025. Still get an Algerian lawyer to confirm exact notification-deadline language before publishing a privacy policy — sources disagree on 72-hour vs. 5-day breach notification windows.
12. Backup/restore procedure defined before any real store's data goes in.

## 9. UI/UX Direction

- Layout: persistent left sidebar (desktop), collapses to icon-only with tooltips, state persisted locally. Mobile: overlay drawer, closes on navigation.
- RTL-ready component structure (logical CSS properties) even though v1 ships French-first — Arabic is a likely fast-follow, not a hypothetical.
- Calm, high-contrast dashboard: neutral background, white cards, one accent color, large numbers, compact readable tables.
- Product/carnet tables: search, filters (category/status/supplier for products; balance status for carnet), color-coded badges (never color-only — pair with text/icon), pagination above ~200 rows, clear empty states with a next-step CTA.
- Quick-add modals for both "Add product" and "New carnet entry" — these are the two highest-frequency actions and should never require a full page navigation.
- Large touch targets (44–48px), icon+label (not icon-only) outside the collapsed sidebar, DZD-suffixed numeric inputs, explicit save confirmation (toast).
- Reference points: Loyverse (approachable scope), Square for Retail (table/adjustment patterns), Sortly (mobile-first visual inventory) — borrow patterns, not their payment/tax assumptions.

## 10. Open Items Explicitly Deferred to Phase 2

- POS/sales checkout flow
- Purchase orders
- Staff accounts/roles, multi-store
- CSV import (export is fine for v1 if time allows)
- Online/automated billing
- Batch-level expiry (single date field is v1-sufficient)
- WhatsApp API automation (v1: generate a shareable text/link the owner sends manually)
