# Database

PostgreSQL on Supabase. Eleven tables, two views, nine RPC functions, and a small
set of triggers that exist to make the important rules unbreakable rather than
merely documented.

This file is the reference for the schema and for *why* it is shaped this way. If
you are changing anything under `supabase/`, read it first.

## The one rule everything else follows

**Stock and money are only ever changed by a database function.**

`products.current_stock`, `product_lots.quantity` and `carnet_customers.balance`
are three numbers that a shop depends on being right. They are changed by exactly
three functions:

| Function | Changes | Used for |
|---|---|---|
| `adjust_stock()` | `products.current_stock`, `product_lots.quantity` | Receiving, damage, theft, returns, counting, corrections |
| `checkout_sale()` | both of the above, plus `carnet_customers.balance` on credit | A sale at the counter |
| `record_carnet_transaction()` | `carnet_customers.balance` | A credit line or a payment entered by hand |

Everything else in the app is read-only with respect to those columns. The reason
is not tidiness. Two screens reading the same figure, computing a new one, and
writing it back is a lost update, and in a shop that shows up as stock that does
not match the shelf and a customer who owes money that the book says they paid.
The server does the arithmetic under a row lock, in one transaction, and writes
the audit row in the same breath.

This is enforced, not requested: **guard triggers reject a direct authenticated
write** to those three columns. Migration `00006` added them; migration `00008`
fixed a case they got wrong.

Parameter order is load-bearing. `p_client_op_id` is the **seventh** parameter of
`adjust_stock()`; the lot parameters (`p_lot_id`, `p_expiry_date`, `p_lot_code`)
were appended *after* it. Never insert a parameter before `p_client_op_id`, and
drop the old overload when the signature changes, or PostgREST's lookup becomes
ambiguous and the call fails at runtime.

## Tables

All eleven have RLS enabled. The `ops` column is the exact set of operations that
have a policy — anything absent is impossible for a client, by construction.

| Table | Ops | Notes |
|---|---|---|
| `stores` | SELECT, INSERT, UPDATE | One store per owner. `INSERT` is restricted to `owner_id = auth.uid()` |
| `profiles` | SELECT, INSERT, UPDATE | Created by trigger, not by the client |
| `categories` | SELECT, INSERT, UPDATE | Per store, archived via `archived_at` |
| `suppliers` | SELECT, INSERT, UPDATE | Per store, archived |
| `products` | SELECT, INSERT, UPDATE | `current_stock` is guard-protected. `archived_at` for soft delete |
| `product_lots` | SELECT | **No write policy at all.** Quantities change only inside the two stock RPCs |
| `stock_movements` | SELECT, INSERT | Append-only. No UPDATE, no DELETE |
| `carnet_customers` | SELECT, INSERT, UPDATE | `balance` is guard-protected. Soft delete via `archived_at` |
| `carnet_transactions` | SELECT, INSERT | Append-only. No UPDATE, no DELETE |
| `data_erasure_log` | SELECT | Loi 18-07 erasure trail. Written by the RPC, readable by the owner |
| `idempotency_keys` | *none* | Server-only. No client policy exists, so no client can read it |

Note the deliberate absences. There is **no `DELETE` policy on any table** —
deleting is not a thing this application does. There is **no write policy on
`product_lots`**, so a lot cannot be tampered with even by its owner through the
API. And `idempotency_keys` has no policy at all.

### Why `product_lots` needs `NULLS NOT DISTINCT`

Its unique constraint is on `(product_id, expiry_date, lot_code)`. Without
`NULLS NOT DISTINCT`, two unlabelled lots with no expiry date are *not* considered
equal by Postgres, so an `ON CONFLICT` insert silently creates a second row and
the same delivery is counted twice. This is not theoretical — it was caught by the
test suite.

## Views

Both are `security_invoker`, so row-level security applies to the caller and a
view can never be a way around a policy.

**`products_overview`** — `products` plus computed `stock_status`
(`healthy` / `low` / `out`) and the derived value figures. The status thresholds
match `src/lib/stockStatus.ts` exactly; a unit test asserts the boundary, because
the browser and the database disagreeing about whether something is "low" is a bug
nobody would notice until a shop ran out.

Zero stock is `out`, even when the threshold is also zero. `stock = threshold` is
`low`, not healthy. A null threshold is healthy.

**`expiry_report`** — one row per open dated lot, with `days_left`,
`value_at_risk` and `stock_value`. It carries `store_id` (added in `00020`
specifically so the view can be scoped to one store) and `cost_price`.

The report used to derive days-left in the browser from `products.expiry_date` —
a single date per product, which cannot describe three deliveries arriving three
weeks apart. The number it showed was the right shape and the wrong thing.

## Functions

### Reads

| Function | Returns |
|---|---|
| `get_dashboard_stats()` | Stock value, low count, out count, product count, carnet total |
| `get_sales_summary(p_from, p_to)` | Revenue, units, sale count, estimated COGS, estimated margin |
| `get_top_products(p_from, p_to, p_limit)` | Best sellers by units and revenue |
| `get_dead_stock(p_days, p_limit)` | Products with no movement in N days |
| `get_reorder_list(p_lookback_days)` | What to buy, with the supplier to buy it from |
| `export_carnet_customer(p_customer_id)` | Full Loi 18-07 data export for one customer |

Aggregation happens in Postgres, never over a page of rows in the browser. The
dashboard used to sum the twenty rows it had loaded and call it a total.

### Writes

**`adjust_stock(p_product_id, p_movement_type, p_quantity, p_unit_cost, p_reason, p_note, p_client_op_id, p_lot_id, p_expiry_date, p_lot_code)`**

The meaning of `p_quantity` depends on the type. This asymmetry is intentional and
is the thing most likely to be got wrong:

| Type | `p_quantity` means | Effect |
|---|---|---|
| `receive` | quantity added | `+qty` |
| `return` | quantity returned | `+qty` |
| `opening_balance` | quantity added | `+qty` |
| `sale` | quantity removed | `-qty` (positive input) |
| `damage` | quantity removed | `-qty` (positive input) |
| `theft` | quantity removed | `-qty` (positive input) |
| `count_adjustment` | **the absolute counted quantity** | delta computed server-side |
| `correction` | a signed delta | applied as given |

`count_adjustment` is the odd one out on purpose: a physical count produces a
number you observed, not a difference you calculated, and asking the user to
subtract is how you get a stocktake that is wrong by exactly the amount of the
mistake. It refuses a result below zero.

**`checkout_sale(p_items, p_payment_mode, p_customer_id, p_amount_received, p_note, p_client_op_id)`**

`p_items` is a JSON array of `{"product_id": uuid, "quantity": number}`.
**It carries no price.** The server reads `products.sell_price` itself, so a
tampered client cannot decide what something costs. It allocates from lots in FEFO
order, writes one movement per lot consumed, and, for a credit sale, records the
carnet transaction in the same transaction.

**`record_carnet_transaction(p_customer_id, p_type, p_amount, p_note, p_client_op_id)`**

`credit` adds to the balance, `payment` subtracts, `adjustment` is signed.
Overpayment is allowed and leaves a negative balance, which means the shop owes
the customer. That is deliberate — it is what happens with real customers — and it
is labelled in the UI as an advance, not an error.

**`anonymize_carnet_customer(p_customer_id, p_reason)`** — Loi 18-07 erasure.
Overwrites the identifying fields in place, keeps the transactions so the shop's
books still balance, and writes to `data_erasure_log`. It replaces the name with
the marker `[anonymised]`, not with a French sentence: it used to write
`'Client anonymisé'`, which then appeared verbatim in Arabic and English sessions,
and which was also the only signal that a row had been erased — making that check
language-dependent.

## Triggers

Trigger functions live in the **`private` schema**, never in `public`. A
`SECURITY DEFINER` function in `public` is published as an RPC endpoint reachable
by any authenticated user. `handle_new_user` and `set_updated_at` were exposed
until migration `00017` moved them; Supabase's security advisor flags this.

| Trigger | Purpose |
|---|---|
| `private.handle_new_user` | On `auth.users` insert, creates the `profiles` and `stores` rows. The client never inserts into `stores` |
| `private.set_updated_at` | Maintains `updated_at` |
| `private.guard_stock_column` | Rejects a direct authenticated write to `products.current_stock` |
| `private.guard_balance_column` | Rejects a direct authenticated write to `carnet_customers.balance` |
| `private.guard_lot_quantity` | Rejects a direct authenticated write to `product_lots.quantity` |

`private.is_store_owner(store_id)` is the ownership helper every policy uses.
Note the `private` schema — migration `00014` moved the helpers there, and a
policy written against `public.is_store_owner` will not resolve.

## FEFO, and the loop trap

`allocate_lots_fefo(product_id)` returns open lots ordered by expiry date, then
`received_at`, then `id`. That final tiebreak matters: two deliveries sharing an
expiry date and a timestamp would otherwise be ordered arbitrarily, and the
product page badge showing "next to sell" could disagree with what a sale
actually consumes.

`src/lib/lots.ts` reproduces that ordering exactly, including the `id` tiebreak,
so the badge cannot lie.

One PL/pgSQL trap is worth knowing before you touch any of these loops:

```sql
-- WRONG: the query is evaluated once, so this never stops early
for v_lot in select ... where v_remaining > 0 loop
  ...
end loop;

-- RIGHT: the condition belongs inside the body
for v_lot in select ... loop
  exit when v_remaining <= 0;
  ...
end loop;
```

The wrong version inserted a `-0` movement, violating
`stock_movements.quantity <> 0`, and aborted any sale that did not drain every
lot. That is the first ordinary sale of any product with more than one delivery.

## Migrations

`supabase/migrations/`, applied in filename order. `supabase/all-in-one.sql` is an
idempotent concatenation generated by `npm run db:bundle` — it is identical to
`master-schema.sql`, and both are regenerated from the migrations, so they cannot
drift. **It is not idempotent against a database that already has the schema**;
run it on a fresh project only.

Apply migrations by hand in the SQL editor, in order. `supabase/seed-demo.sql`
will populate a demo store afterwards.

## Testing

Six suites in `supabase/tests/`, 96 assertions, all self-cleaning:

| Suite | Assertions | Covers |
|---|---|---|
| `rls_rpc_tests.sql` | 21 | Cross-store isolation, guard triggers, append-only history |
| `checkout_rpc_tests.sql` | 16 | Checkout, FEFO allocation, idempotency |
| `product_lots_tests.sql` | 17 | Lot arithmetic and the lot-sum invariant |
| `trends_rpc_tests.sql` | 11 | Dashboard trends |
| `legal_rpc_tests.sql` | 12 | Export and erasure |
| `insights_rpc_tests.sql` | 19 | Sales, margins, dead stock, reorder |

They run against a real PostgreSQL and clean up after themselves. They are manual
because local Docker was declined — and they are the reason several of the defects
listed in [PROJECT.md](PROJECT.md) were found at all. Treat them as a real gate.
