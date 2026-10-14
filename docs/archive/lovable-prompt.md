Build a web platform for Algerian mini market owners to manage product stock and customer credit tabs ("carnet"). Single owner per store. Clean, modern, minimal SaaS dashboard — French-first UI, DZD currency. Stack: React + TypeScript + Tailwind CSS, Supabase (Auth, Postgres with Row Level Security, Storage).

## Overall structure

**Auth pages** (public, unauthenticated):
- Login (email + password)
- Sign up (email, password, store name → creates a `stores` row on signup with `owner_id = auth.uid()`)
- Forgot / reset password (use Supabase Auth's built-in flow, do not build custom password handling)

**Main app** (authenticated, wrapped in a layout with a collapsible left sidebar):
- Sidebar items in order: Dashboard, Products, Inventory, Carnet, Suppliers, Reports — with Settings pinned at the bottom, separated from the main nav group.
- Sidebar collapses to icon-only with hover tooltips on desktop (persist collapsed/expanded state in localStorage). On mobile it becomes an overlay drawer that closes after navigation. Do not use icon-only nav on mobile.
- Topbar: page title, and a profile/logout menu.

## Design direction

Calm, high-contrast, modern SaaS look: neutral light background, white cards with soft shadows, one accent color (pick a clean blue or green — not default indigo), generous spacing, large readable numbers on KPI cards. Icon + label combos everywhere except the collapsed sidebar. Minimum 44px touch targets. Never use color alone to signal status (pair badges with text: "Faible" not just an amber dot). Numeric inputs show a DZD suffix. Every save action shows a toast confirmation. Empty states always explain the next step and offer a clear CTA button (e.g. "Aucun produit — Ajouter votre premier produit").

## Pages

**Dashboard**
- 4 KPI cards, no decorative charts: Valeur totale du stock, Produits en stock faible, Produits en rupture, Solde carnet total (amount customers owe).
- Below: a low-stock list (product name, current qty, threshold, "Réceptionner" quick action), a recent stock movements feed, a recent carnet activity feed.
- Two prominent quick-action buttons always visible: "Ajouter un produit" and "Nouvelle entrée carnet" — both open quick-add modals, no full page navigation.

**Products** (list page)
- Table: name, category, current stock (badge: green healthy / amber low / red out), sell price, actions (view, edit, adjust stock, archive).
- Search by name/SKU/barcode. Filters: category, stock status, supplier, active/archived. Pagination above ~200 rows.
- "Ajouter un produit" opens a quick-add modal: name, category, unit (piece/kg/g/liter/box/pack — default piece), cost price, sell price, current stock, low-stock threshold (optional), barcode (optional, manual entry field, scanner-keyboard compatible), expiry date (optional), supplier (optional).

**Product detail**
- Full product info (editable) + a movement history table scoped to this product (type, quantity, reason, date).

**Inventory**
- Sub-views or tabs: "Réceptionner" (add incoming stock — select product, quantity, optional supplier link, optional unit cost), "Ajuster" (correct stock — select product, new quantity or delta, REQUIRED reason dropdown: comptage/dommage/vol/correction), "Historique" (full movements log, filterable by product/type/date range).
- Every receive/adjust action must call a single Postgres RPC function that atomically locks the product row, validates, updates `products.current_stock`, and inserts the `stock_movements` row — never compute final stock in the frontend.

**Carnet**
- Customer list: name, phone, current balance (amount owed to store, color-coded), last activity date. Search by name/phone.
- "Nouvelle entrée carnet" quick-add: pick or create a customer, transaction type (crédit = they now owe more / paiement = they paid something back), amount, optional note.
- Customer detail page: running balance, full transaction history, "Enregistrer un paiement" button, and a "Partager rappel WhatsApp" button that generates a pre-filled WhatsApp share link (`wa.me`) with a friendly reminder message including the balance — do not build WhatsApp API integration, just a share link.
- Balance updates must go through a single Postgres RPC function that atomically updates `carnet_customers.balance` and inserts the `carnet_transactions` row — never compute balance in the frontend.

**Suppliers**
- Simple list: name, phone, WhatsApp, address, notes, linked product count. Add/edit/archive.

**Reports**
- Low-stock report (table, exportable), stock value report, movement summary by date range, carnet outstanding total by customer (exportable). Keep this page simple — tables with export, not dashboards with charts.

**Settings**
- Store profile (name, address, phone, currency fixed to DZD, language selector — French only functional in v1, structure it so Arabic/RTL can be added later without a rewrite), and a read-only "Plan" section showing status text (no billing UI — this is set manually by the operator for now).

## Database (Supabase Postgres) — create via migration, enable RLS on every table

```sql
profiles (
  id uuid primary key references auth.users(id),
  full_name text, phone text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null, address text, phone text,
  currency char(3) not null default 'DZD',
  language text not null default 'fr',
  timezone text not null default 'Africa/Algiers',
  created_at timestamptz default now(), updated_at timestamptz default now()
);

categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null, archived_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(store_id, name)
);

suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  name text not null, phone text, whatsapp text, address text, notes text,
  archived_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

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
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique(store_id, sku), unique(store_id, barcode)
);

stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  movement_type text not null check (movement_type in
    ('receive','sale','return','damage','theft','count_adjustment','correction','opening_balance')),
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2), reason text, note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

carnet_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  full_name text not null, phone text, notes text,
  balance numeric(12,2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

carnet_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id),
  customer_id uuid not null references carnet_customers(id),
  type text not null check (type in ('credit','payment','adjustment')),
  amount numeric(12,2) not null, note text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

RLS pattern for every business table (adapt table name): access allowed only where `store_id` belongs to a store owned by the current user —
```sql
exists (select 1 from stores where stores.id = <table>.store_id and stores.owner_id = auth.uid())
```
Write separate policies for select/insert/update/delete. Never allow a policy that trusts a client-supplied `store_id` without this check.

Create two Postgres RPC functions:
1. `adjust_stock(product_id, movement_type, quantity, unit_cost, reason, note)` — locks the product row, validates, updates `current_stock`, inserts into `stock_movements`, all in one transaction.
2. `record_carnet_transaction(customer_id, type, amount, note)` — locks the customer row, updates `balance` (credit adds, payment subtracts), inserts into `carnet_transactions`, all in one transaction.

All frontend stock/carnet writes must call these functions, not write to `products.current_stock` or `carnet_customers.balance` directly.

## Constraints

- Keep every file under ~250 lines; split components logically.
- Soft-delete only (`archived_at`) for products, categories, suppliers, carnet_customers — never hard delete.
- No POS/checkout flow, no online billing/payment page, no staff roles, no multi-store, no CSV import (export is fine if trivial), no offline sync engine. If in doubt, don't build it — keep this MVP minimal per the pages listed above.
- No decorative charts anywhere — tables and KPI cards only.
