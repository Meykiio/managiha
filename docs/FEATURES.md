# Features

What Managiha does, screen by screen, and the reasoning behind the parts that are
not obvious. For the data model underneath, see [DATABASE.md](DATABASE.md).

Interface languages: **French** (reference), **English**, **Arabic with full RTL**.
Dark and light themes. Currency is DZD, fixed.

---

## Scanner — the sell flow (`/scanner`)

The busiest screen in the product, and the reason it is first in the sidebar.

- **Full-screen cart**, deliberately outside the app shell. At the counter you
  want the cart and nothing else.
- **Find by barcode or by name.** It used to be barcode-only, which excludes a
  large part of what a quartier grocery sells — bulk goods, repacked rice, spices,
  anything with no usable code.
- **Create a product without leaving the sale.** When a barcode is not found, the
  create form opens over the cart and returns the saved product straight into it.
  This used to navigate away to a form with the barcode in a query string that
  nothing read — and the cart, which lives in the scanner component, was lost. Add
  a product mid-sale is the most common real sequence in a small shop.
- **Re-validates at checkout.** Stock and prices are re-read from the server before
  the sale completes, so a price changed in another tab cannot be charged stale,
  and a shortage is caught before money changes hands.
- **Cash or credit.** Cash computes change. Credit puts the sale on a customer's
  carnet in the same transaction.
- **A receipt is shown only after the server confirms.** A sale is never queued
  offline, on purpose — see [OFFLINE.md](OFFLINE.md).

## Dashboard (`/`)

- Four KPIs, aggregated **in Postgres**: stock value, low count, out count, total
  carnet balance. These used to be computed over the twenty rows the browser had
  loaded, which is a total of a page.
- **Expiry alert** — open lots approaching their date, with the value at risk.
- **Needs attention** — low and out-of-stock products, each with a one-click
  "Réceptionner" that opens the receive form prefilled.
- Recent movements and recent carnet activity.
- Quick actions that open modals rather than navigating away.
- **An empty store offers sample data** instead of four zeros, so the first
  screen after signing up is not a wall.

## Products (`/products`)

- Search by name, SKU or barcode; filter by category, stock status, supplier and
  archived; sortable columns; server-side pagination at 20 per page.
- Add or edit with category, unit, cost, sell price, low-stock threshold, barcode,
  expiry and supplier. Opening stock is recorded as an `opening_balance`
  **movement**, so the audit trail starts at the first row rather than at the first
  correction.
- **Margin, on the product page and live while you type the two prices**, with a
  warning before you sell below cost. Gross margin is labelled an estimate, because
  a sale records the price *charged* and the cost side uses the product's current
  `cost_price` — the revenue figure is exact.
- Product detail: lots in FEFO order with the next one to sell badged, movement
  history, image upload to a private per-store bucket.

## Inventory (`/inventory`)

Four tabs, deep-linkable via `?tab=`.

- **Receiving** captures an expiry date and lot code per delivery. The schema
  supported lots and FEFO from migration `00016`, but the form never sent a date,
  so every delivery collapsed into one lot and the expiry feature was inert from
  the UI.
- **Adjusting** requires a reason: count, damage, theft, return, correction.
  A count takes the **absolute counted quantity**; the server computes the delta
  under a row lock. Asking a shopkeeper to subtract is how you get a stocktake
  wrong by exactly the size of the mistake.
- **Counting the shelf** is a session, not forty dialog opens. Search or scan each
  product, see counted-versus-expected and the live variance, and submit only the
  lines that changed. Each line becomes its own movement, because each is a
  separate physical correction with its own record.
- **History** — every movement, signed, with the reason and the note.

## Carnet (`/carnet`)

The customer credit book, which is the feature most competitors treat as an
afterthought and which is the one shops actually ask for.

- Customer list with balances: *Doit X* / *À jour* / *Avance créditée*.
- Credit and payment entries, picking or creating a customer inline.
- Customer detail with the running balance, full transaction history, and a
  **pre-filled WhatsApp reminder** (`wa.me` deep link — no API integration, no
  account, no business verification).
- Archived-customer toggle, because archiving used to be a one-way door: the
  customer disappeared from the list and the restore control was on a page you
  could no longer reach.
- **Loi 18-07 data rights**: export a customer's data as JSON, and erase it. Erasure
  anonymises in place and logs it, so the shop's books still balance.

## Suppliers (`/suppliers`)

Contact details, phone and WhatsApp links, archived toggle, and a product count
that links through to that supplier's products.

## Reports (`/reports`)

Seven tabs, each exportable to CSV in a shape Excel opens directly (UTF-8 BOM,
`;` separators — French Excel treats a comma-separated file as one column).

| Report | Answers |
|---|---|
| Ventes | Revenue, units, sales and estimated margin over 7 / 30 / 90 days |
| Réassort | What to buy, grouped by supplier, with a WhatsApp order message |
| Péremption | Open lots by urgency window, with the value at risk, and a write-off action |
| Stock faible | What needs reordering and what has run out |
| Valeur du stock | What the shelves are worth, at cost and at retail |
| Mouvements | Movement summary by period |
| Carnet impayés | Who owes money, linking to each customer |

Deep links work: the active tab lives in the URL.

## Settings (`/settings`)

Store profile, fixed DZD currency, language selector, theme, password change
(re-authenticating first), plan information, and links to the privacy policy and
the source.

---

## Cross-cutting

| | |
|---|---|
| **Languages** | French, English, Arabic. RTL flips the document and the layout uses logical properties throughout |
| **Theme** | Dark by default, light available, applied before first paint so there is no flash |
| **Offline writes** | Receive/adjust/carnet writes queue in IndexedDB and replay. Sales never queue. See [OFFLINE.md](OFFLINE.md) |
| **Accessibility** | WCAG 2.2 AA asserted by axe on every public route, in both themes and in RTL |
| **Errors** | An error boundary, plus optional Sentry reporting that is off unless a DSN is configured |
| **Money** | DZD only, French number grouping, tabular figures everywhere a number is compared |

---

## Deliberately absent

Managiha is a **back-office tool, not a point of sale**. It records what you sold
so you know what you have and what you earned. It does not produce fiscal invoices
(Décret Exécutif 05-468), take card payments, print fiscal tickets, or close a
till.

This is a deliberate position, not an omission. From **1 January 2027**, Algerian
businesses using "un logiciel de gestion ou un système de caisse" must hold an
attestation certifying inaltérabilité, sécurité, conservation and archivage of
their data. That obligation falls on the shop owner. Staying out of the till
category means a shopkeeper never inherits an obligation this software cannot
certify — and can run Managiha alongside whatever fiscal system they already use.

Also out of scope: CSV **import** (export only), decorative charts, staff roles,
multi-store, subscription billing, and any hard-delete affordance.
