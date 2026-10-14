# What the app does not do yet

Written after a full read of the routes, the pages, the 20 migrations and the data
layer, plus a look at what the Algerian competitors actually advertise (Almawarid,
GestiumPRO/para, AlgoStock). Ordered by how much it costs the shop owner to live
without it.

The organising idea: **the same person uses this in two modes.** Behind the counter
they need speed and one hand — scanner first, minimum taps, works with no network.
At night they need answers — what did I sell, what do I reorder, what expired, what
did I earn. Almost every gap below is one of those two modes being served badly.

---

## A. Things that are broken, not missing

These are promises the app already makes and does not keep. Nothing here is a new
feature.

### A1. "Create this product" from the scanner discards everything

`ScannerPage.tsx:70-73` navigates to `/products?create=true&barcode=<code>`.
`ProductsPage.tsx` never reads query parameters — only `InventoryPage` does. So the
modal does not open and the barcode is dropped.

This is the most common real sequence in the shop: a customer brings something to
the counter, you scan it, it is not in the system, you add it, you sell it. Today
the first step throws away the work and lands you on a list.

**Fix:** read the params, open the form prefilled, and return to the scanner with the
product already in the cart.

### A2. The scanner cannot find a product by name

`ScannerPage.tsx:151` is `inputMode="numeric"`. Manual entry is a barcode field.

A large share of what a quartier grocery sells has no usable barcode — bulk goods,
locally packaged items, repackaged rice and spices, anything the owner buys by the
sack. Today those products cannot be sold from the sell flow at all.

The competitors all lead with this: *"recherche instantanée par nom, sans
code-barres obligatoire"*, *"un lecteur reste possible si vous en avez un"*. We have
it backwards — barcode required, name search absent.

**Fix:** the manual field searches names and barcodes and shows a picker.

### A3. Archived carnets are a one-way door

`CarnetPage.tsx:64` always filters `archived_at is null` and has no archived toggle.
Products and suppliers both have one. Archive a customer and they vanish from the
list; the only restore control is on the detail page, which you can no longer
reach by clicking. Recovery means typing the URL.

### A4. Product and customer pickers silently hide data

`ProductSelect` shows 30 rows and filters only the first 100 (`ProductSelect.tsx:67-74`).
`CustomerSelect` caps at 20 (`api.ts:126`). Past those counts the picker simply does
not contain the thing you are looking for, with no indication that it was cut off.
For a shop with 1 200 references this makes receiving and carnet entry unreliable.

**Fix:** server-side search instead of a client-side slice.

### A5. A hardcoded French string survived the i18n pass

`HistoryTab.tsx:166` builds `` `${fmtQty(count)} mouvement(s)` `` directly. In an
Arabic or English session it stays French.

---

## B. The expiry and lot feature exists in the database and not in the app

This is the largest gap, and it is not a small one: migration `00016` built
`product_lots`, FEFO allocation, 17 SQL assertions, an `expiry_report` view with
`days_left` and `value_at_risk` — and **the receive form never captures an expiry
date or lot code** (`ReceiveStockForm.tsx:97-132` has product, quantity, cost,
supplier, note and nothing else). So `p_expiry_date`, `p_lot_code` and `p_lot_id`
are never passed, every delivery collapses into one lot derived from
`products.expiry_date`, and `expiry_report` is referenced by nothing in `src/`.

`fetchExpiringLots` and `nextLotToSell` in `src/lib/lots.ts` are written and never
called. The expiry report queries `products.expiry_date` and recomputes days-left
client-side instead of reading the view.

So FEFO is real in Postgres and invisible in the shop. Three things fix that:

### B1. Capture the delivery actually received

Add expiry date and lot code to the receive form, wired to the parameters the RPC
already accepts. Optionally scan each unit in.

### B2. Make expiry actionable, not just listed

Every competitor treats DLC as a headline feature — *"alertes J-7, J-3 et J-0"*,
*"produits frais et semi-frais représentent 30 à 40 % du chiffre d'affaires — et la
majorité des pertes"*. We have the data and show it in one report tab nobody opens.

**Fix:** an expiry view that leads with urgency and money (value at risk), and each
row offers the action — mark down the price, write it off as damage, or mark it
sold. A date with no action attached is just a list.

### B3. Show which lot will be sold

FEFO decides it server-side. Surfacing it at the counter is what makes the owner
trust the ordering.

### B4. Physical inventory by scanning

Counting the shelf is a monthly ritual, and every competitor sells a scanner-based
count. The `count_adjustment` path already exists and computes the delta under a row
lock; what is missing is a counting screen.

---

## C. The owner's questions have no screen

### C1. Margin

`cost_price` and `sell_price` are both stored. Nothing anywhere shows the margin, and
nothing warns when a sell price is below cost. One competitor names the problem
directly: *"Marges : prix d'achat vs vente, pour ne pas vendre à perte."*

### C2. What to reorder

There is a low-stock report. There is no reorder list — the thing you actually take
to the wholesaler. This is the natural next step after "what is low": grouped by
supplier, with a suggested quantity from recent sales, shareable to the supplier on
WhatsApp, which is how ordering happens here.

### C3. What did I sell, and what did I earn

`get_movements_summary` groups movements by type and nothing else. There is no
period sales figure, no top products, no "what has not sold in 90 days" — dead stock
being the quietest way a small shop loses money.

**Careful:** this is reporting on sales already recorded. It is *not* a caisse
closure — no fond de caisse, no billetage, no écart. Those are the things that make
software a "système de caisse" under the 2027 attestation rule and they stay out.

### C4. Customer returns

`return` is a valid `movement_type` and no screen produces it (`ADJUST_REASONS`
omits it). A customer bringing something back cannot be recorded properly.

---

## D. Flow and navigation

1. **Report rows are inert.** Low-stock and carnet-outstanding rows render as plain
   text with no link to the product or customer. A report you cannot act on is a
   dead end.
2. **The scanner is an island.** Reachable only from one dashboard button, absent
   from the sidebar, and its only exit is back to the dashboard. After taking a sale
   that went on the carnet there is no path to that customer.
3. **The product page cannot change stock.** To receive or adjust the product you are
   looking at, you must leave the page.
4. **Suppliers do not link to their products**, and `product_count` is text.
5. **Settings cannot change the password** (only the email reset flow) and has no
   account deletion, despite the Loi 18-07 erasure and access RPCs being built and
   unreferenced.
6. **The privacy back-link is hardcoded to `/login`**, so from authenticated Settings
   it points at the wrong place.

---

## E. What is deliberately not in this plan

- **Fiscal invoicing, TVA, timbre, QR, NIF/NIS.** Every competitor has it. It is the
  one thing that would put our users in breach, because we cannot certify
  inaltérabilité. Out.
- **Caisse closure** (fond, billetage, écart de caisse). Same reason, one step closer.
- **Card payments, subscriptions, loyalty points, multi-store, staff roles, thermal
  printing, purchase orders with supplier invoicing.** Google-able scope, not
  needed for a single-owner quartier shop, and each drags in a maintenance surface.

---

## Order of work

| # | Phase | Delivers | State |
|---|---|---|---|
| 1 | **Sell what you have** | A1, A2, A3, A4, A5 — the scanner can add a new product and find one by name; archiving stops being a trap; pickers stop hiding data | **done** |
| 2 | **Know what expires** | B1, B2, B3 — deliveries carry a real date, and expiring stock becomes an action with a value attached | **done** |
| 3 | **Know what you earn** | C1, C3, C4 — margins, period sales, top and dead stock, returns | **done** |
| 4 | **Know what to buy** | C2 — reorder list by supplier, shareable | **done** |
| 5 | **Count the shelves** | B4 — physical inventory by scan | **done** |
| 6 | **Join it up** | D1–D6 — clickable reports, scanner in the nav, product-page actions, supplier links, password and Loi 18-07 in Settings | **done** |

---

## What the work found that the plan did not expect

Recorded because each was a defect rather than a missing feature, and none was
visible from reading the code:

1. **A sale recorded from the inventory tab earned nothing.** The ledger stores the
   price charged in `unit_cost`; `checkout_sale` set it and the inventory sell form
   did not, so those sales contributed zero revenue. Nothing looked wrong — the
   stock moved and the movement appeared — because the only place the figure
   mattered was a report that did not exist yet. Found by running the new RPC test
   suite on itself. Fixed in both directions (00022).
2. **The customer's name was never rendered on the customer detail page.** You
   arrived at a balance with no indication of whose it was.
3. **`anonymize_carnet_customer` wrote a French label into the data**, which then
   appeared verbatim in Arabic and English sessions — and it was also the only
   signal that a row had been erased, making that client-side check
   language-dependent. Now a marker (00023).
4. **`checkout_sale` wrote two French sentences into the data** on every sale:
   `'Vente comptant'` on the movement and `'Achat 3 produit(s)'` on the credit
   entry. Both are rendered in the history, the customer's transactions and the CSV
   export. Fixed in 00024.
5. **`expiry_report` had no `store_id`**, so the view could only be used by someone
   who owns exactly one store — a product decision the database did not enforce.
   Fixed in 00020.
6. **Three more hardcoded French strings** where the dictionary key already
   existed: two restore hints and the movement-count sentence.

The pattern is consistent: the missing features were easy to see and the broken
ones were not, because a feature that is absent announces itself and a feature that
is wrong does not. Every defect above was found by running something, not by
reading it.

---

## What is still not built, and why

- **A caisse closure** (opening float, cash count, till reconciliation). Every
  competitor has one. It is one step past reporting on recorded sales and into
  "système de caisse" territory, which is what the 2027 attestation rule is about.
  Out on purpose, not overlooked.
- **Fiscal invoicing, TVA, timbre, QR, NIF/NIS.** Same reason, one step further.
- **Supplier purchase orders and invoice reconciliation.** Real scope, and the
  reorder list already covers the actual need, which is knowing what to buy.
- **Loyalty points, customer purchase history as a shopping record.** The carnet
  covers the relationship that matters in a quartier shop.
- **Full local-first reads.** The write queue is built; caching reads is a
  data-layer rewrite, not a feature. See `docs/OFFLINE.md`.

