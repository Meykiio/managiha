# Managiha — Project

French-first stock + carnet (customer credit ledger) for Algerian mini-markets.
Single owner per store. DZD currency. React 18 + TypeScript + Vite + Tailwind + Supabase.

## Current State

| | |
|---|---|
| **Working** | Auth, dashboard, products, stock movements, lots and expiry, carnet, suppliers, sales and reorder reporting, settings, barcode + name sell flow, offline write queue. |
| **Quality gate** | `npm run gate:all` — lint + typecheck + **134 tests** + build + 20 Playwright/axe + knip. |
| **Database** | 25 migrations applied to the live project. Six SQL suites, **96 assertions**, all passing. |
| **Roadmap** | Phases 0–7 done. The work that followed is in `docs/archive/ROADMAP-NEXT.md`, and is also done. |

## What the last stretch of work changed

`docs/archive/ROADMAP-NEXT.md` is the full account. In short, five things moved from
"designed" or "partly built" to "works":

- **The scanner can sell anything.** It searched barcodes only, and its
  "create this product" button navigated away with the barcode in a query string
  that nothing read — losing the cart, which lives in the scanner component. A
  quartier grocery sells a lot of things with no usable barcode. Now it searches
  names too, and creates the product in place without leaving the sale.
- **Lots and expiry became real.** Migration 00016 built `product_lots`, FEFO and
  an `expiry_report` view, and the receive form never sent a date — so every
  delivery collapsed into one lot and nothing read the view. Receiving now captures
  an expiry date and lot code per delivery, expiring stock leads the dashboard with
  its value at risk, and the expiry screen can write a lot off.
- **The owner's money questions have screens.** Sales and margin over a period,
  best sellers, dead stock, and a reorder list grouped by supplier that can be sent
  on WhatsApp. Four RPCs in migrations 00021–00022.
- **Margin is visible**, on the product page and while typing the two prices, with
  a warning before selling below cost.
- **Counting the shelf** is a session rather than forty dialog opens.
- **The phone layout holds.** Seven report tabs were about 815px of content in a
  390px viewport with no scroll container, so the strip overflowed the document
  and gave every affected page a horizontal scroll. It was measured, not spotted:
  an instrumented pass at phone width reported the largest element on each page as
  the mobile-drawer backdrop, which had *stretched* to the document width — the
  symptom pointed at the effect, not the cause. Sorting offenders by "widest
  non-fixed element that no ancestor clips" named the tab strip in one run.
  `overflow-x-auto` fixed all eleven findings. Sort headers and row links were
  also 20–24px tall, which is a miss on a phone; they are now 36–40px.
- **The demo store now demonstrates the product.** It recorded stock movements but
  never a sale, so every revenue, margin and best-seller figure rendered as zero —
  which reads as a broken report rather than an empty one. It now drives
  `checkout_sale`, ages two sales so the 7/30/90-day control is meaningful, and
  leaves four products low or empty so the alerts have something to show. It reads
  60,165 DZD of stock, 3 low, 1 out, 4,950 DZD owed.

## The documentation

Ten current documents, plus `docs/archive/` for everything historical. The
reference set is [FEATURES.md](FEATURES.md), [DATABASE.md](DATABASE.md),
[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) and [DEPLOY.md](DEPLOY.md); the public
entry points are the [English](../README.md) and [Arabic](../README.ar.md) READMEs,
which are kept in step with each other.

Before this pass there were seventeen files in `docs/` of which four were current,
and nothing marked which was which. `STATUS.md` still opened with a verdict table
claiming 57 tests, migrations 00000–00006, and "product image upload — not built".
A stale document that is confidently wrong is worse than no document, because it is
read and believed.

## The defects that work found

Seven, none visible from reading the code. The most serious: **a sale recorded from
the inventory "sell" tab earned nothing.** A sale stores the price charged in
`unit_cost`, `checkout_sale` set it, and the inventory form did not — so those
sales contributed zero revenue. The stock moved, the movement appeared in the
history, and nothing looked wrong, because the only place the missing figure
mattered was a report that did not exist until the same commit. Found by running
the new RPC suite on itself, and fixed in both directions (00022).

The others: the customer's name was never rendered on the customer detail page;
`anonymize_carnet_customer` and `checkout_sale` both wrote French sentences into
the database, which then appeared in Arabic and English sessions; `expiry_report`
had no `store_id`; and three more hardcoded strings where the dictionary key
already existed.

The seventh is the most instructive, because nothing was wrong with the
application. **The accessibility suite was asserting nothing in CI.** Vite inlines
`import.meta.env.VITE_*` at build time; `playwright.config` supplied placeholder
Supabase credentials through `webServer.env`, which sets variables on the preview
*server* process, long after those values were baked into the JavaScript. In CI,
with no `.env`, the build produced an app with no Supabase URL, `App` rendered the
config-error screen instead of the login page, and seven tests failed.

The axe assertions, though, **passed** — a page with no forms, no links and no
interactive controls has no accessibility violations. So the suite that exists to
prove the interface is accessible was analysing an error screen, in both themes and
in RTL, and reporting green. A test that cannot fail is worse than no test, because
it is counted as coverage.

Fixed with a committed `.env.test` of placeholders loaded by
`vite build --mode test`. The e2e build is now identical everywhere and cannot pick
up a real project's credentials — which it previously did, making the suite
non-hermetic on any machine that had a `.env`. Verified by renaming `.env` away and
running the gate: 20/20 pass with no `.env` present.

The pattern is worth stating: the missing features were easy to find and the broken
ones were not, because a feature that is absent announces itself and a feature that
is wrong does not. A test that passes for the wrong reason belongs in that second
category.

## Nothing in this tree is unexecuted

Earlier revisions of this file carried an "unverified work" warning covering
migrations 00013-00015, written while no Postgres was reachable. All of them have
since been applied to a live project and exercised by the SQL suites, and the
warning was removed rather than left to age into a lie.

Verification is by execution, not by reading: see *Verification status* below.
There is no local Docker step, deliberately — the project owner declined it, and
the suites run against a real Supabase project instead. That is a slower loop and
it is the loop that has been finding the defects.

## The product boundary (decided, do not drift)

Managiha is a **back-office tool, not a point of sale**.

**It does:** stock and stock value, customer credit ledger with WhatsApp reminders,
expiry tracking, sales recording, CSV exports, reports.

**It does NOT:** issue fiscal invoices (DE 05-468), process card payments,
print fiscal tickets, manage staff, manage multiple stores.

**Why this is a hard boundary.** From 1 January 2027, Algerian businesses using
"un logiciel de gestion ou un système de caisse" must hold an attestation
certifying inaltérabilité, sécurité, conservation and archivage of the software.
That obligation falls on the shop owner, and we cannot certify it. Staying out
of "caisse" protects our users. See README for the user-facing wording.

Secondary consequence: Managiha takes no payment and sells nothing online, so
**Loi 18-05** (Satim-certified gateway, .dz domain, Algerian hosting) does not
apply. Do not add card payments or subscriptions for Algerian users without
re-reading that law.

## Core flows

1. **Receive stock** — quantity + reason, one atomic RPC, movement logged.
2. **Record credit or payment** — one atomic RPC, balance recomputed server-side.
3. **Sell at the counter** — scan barcode → cart → cash or carnet credit.

## Architecture rules (never break these)

1. **RPC-only writes.** `products.current_stock` and `carnet_customers.balance`
   are owned by Postgres functions. Database triggers (`guard_stock_column`,
   `guard_balance_column`) reject any other authenticated write. Never compute
   final stock or balance in the frontend. Tests assert zero direct writes.
2. **Soft delete only.** `archived_at`. No hard delete anywhere.
3. **History is immutable.** No UPDATE/DELETE on `stock_movements` or
   `carnet_transactions`. Corrections are new movements.
4. **i18n.** Every UI string via `t()`. Logical CSS only (`ps-*`, `me-*`, `start-*`,
   `end-*`) to stay RTL-safe. French is the reference locale: `TranslationKey` is
   derived from it, and every other locale is typed `Record<TranslationKey, string>`
   so a missing key is a compile error, not a silent French fallback.
5. **Max 250 lines per file.** Enforced by ESLint `max-lines`. No known breach.
6. **Server-side pagination**, `PAGE_SIZE = 20` from `src/lib/constants.ts`.

## Quality gate

```bash
npm run gate   # lint + typecheck + test + build
```

ESLint enforces `max-lines: 250` and the `jsx-a11y` recommended set, so the file
size limit and the accessibility sweep cannot silently rot. Vitest runs in a
single fork: the gate was intermittently dying with an out-of-memory error while
running four node processes back to back, and a gate that fails for environmental
reasons is one people learn to ignore.

All of it is now in place: knip, gitleaks, Playwright + axe, Semgrep, Trivy,
Lighthouse CI and GitHub Actions. `npm run gate:all` runs the lot. What each
scanner is for, and what was deliberately left out, is in `docs/TOOLING.md`.

Database changes additionally require all six suites in `supabase/tests/` to
pass against a real project — **96 assertions**:

| Suite | Assertions |
|---|---|
| `rls_rpc_tests.sql` | 21 |
| `checkout_rpc_tests.sql` | 16 |
| `product_lots_tests.sql` | 17 |
| `trends_rpc_tests.sql` | 11 |
| `legal_rpc_tests.sql` | 12 |
| `insights_rpc_tests.sql` | 19 |

They self-clean and are how the sales-revenue defect above was found, so they are
a real gate and not a formality.

## Roadmap

| Phase | Goal | State |
|---|---|---|
| 0 | Green baseline, honest repo, one scanner per job | done |
| 1a | `checkout_sale` rewrite + write idempotency | verified |
| 1b | RLS rewrite (`(select ...)`, `TO authenticated`), private schema | verified |
| 1c | SQL suites for the fixed bugs, generated schema bundle | verified |
| 2 | `product_lots` + FEFO, lot-aware checkout | verified |
| 3 | Offline: durable write queue for receipts and credit entries | done, scoped |
| 4 | Flow + UI redesign, WCAG 2.2 AA, carnet as hero | done |
| 5 | Legal pack: Loi 18-07 erasure and access paths, trilingual policy | done, needs review |
| 6 | Release engineering: CI, secrets, budgets, CSP, design system | done |
| 7 | Launch: deployed to preview, checklist written | ready, see LAUNCH.md |

Companion documents: `DESIGN-SYSTEM.md` (what was adopted and what was found wrong
in the reference), `OFFLINE.md` (the local-first boundary, stated plainly),
`LEGAL.md` (registre des traitements and the rights runbook), `LAUNCH.md` (deploy
state and the honest pre-launch list).

### What Phase 4 actually delivered

Done: the dashboard leads with money owed rather than stock value, a WCAG 2.2 AA
sweep (six `autoFocus` removed, icon buttons labelled, a dangling `aria-labelledby`
in Tabs fixed, WAI-ARIA keyboard navigation added), and `jsx-a11y` plus
`max-lines` wired into the gate.

Not done: the scanner and carnet flows have not been reworked, and no Playwright
or axe run has happened. The accessibility work is a lint sweep and a manual pass,
not an audit against the success criteria.

## Verification status: EXECUTED

Migrations 00000-00017 were applied to a live Supabase project (PostgreSQL 17.11)
in filename order, then all three SQL suites were run against it. Migrations
00018-00024 have since been applied to the same project, and the three suites added
alongside them — trends, legal and insights — were run the same way.

| Suite | Assertions | Result |
|---|---|---|
| `rls_rpc_tests.sql` | 21 | all pass |
| `checkout_rpc_tests.sql` | 16 | all pass |
| `product_lots_tests.sql` | 17 | all pass |
| `trends_rpc_tests.sql` | 11 | all pass |
| `legal_rpc_tests.sql` | 12 | all pass |
| `insights_rpc_tests.sql` | 19 | all pass |

The RLS, guard-trigger, FEFO, lot-sum and idempotency invariants are now measured
rather than argued. `anon` is confirmed unable to read `stores` at all
(`42501 permission denied`), which is the intended post-00014 behaviour.

The live project currently holds one store and no products, so the suites are the
only thing that has exercised these functions on real data.

### Defects that only execution found

Eight real defects. Seven would have shipped looking correct, and the four found
during review are a useful measure of how much review was worth on its own.

Found by running the migrations:

1. **`checkout_sale` could not be created at all.** `p_client_op_id uuid` had no
   default but followed three parameters that did. PostgreSQL rejects the whole
   function with `42P13`. Every checkout call would have failed on a fresh install.
2. **Any sale that did not drain every lot aborted.** A PL/pgSQL `FOR` loop
   evaluates its query once, so `where v_remaining > 0` never stopped the loop;
   it went on to insert a `-0` movement, violating `stock_movements.quantity <> 0`.
   The exit condition had to move inside the loop body. This fires on the first
   ordinary sale of a product with more than one lot.
3. **Unlabelled lots were duplicated on every receipt.** My own comment claimed
   "NULLs are distinct, so the ON CONFLICT clause is safe for unlabelled lots",
   which was backwards: distinct NULLs mean the conflict never matches, so bread
   and cleaning products accumulated a new lot row per delivery. Fixed with
   `NULLS NOT DISTINCT`.

Found by running the tests:

4. `checkout_rpc_tests.sql` seeded products by setting `current_stock` directly.
   Since 00016 that leaves the product with no lots, so every sale was correctly
   rejected and seven assertions failed. The seed now opens stock through
   `adjust_stock`.
5. `checkout_rpc_tests.sql` asserted that two lines of 6 against stock 20 must be
   rejected. 12 is a legitimate purchase; the test was miscalibrated and had to
   send 11 + 11.
6. All three suites created their context table and then only `UPDATE`d it, never
   `INSERT`ed. Every downstream SELECT returned NULL, which surfaced as a
   misleading `Authentification requise` from inside a write RPC rather than as
   the empty context it was.
7. Nine `format()` calls used a bare `%` (`format('product=%, lots=%', ...)`),
   which is an invalid specifier and aborts the block.
8. `rls_rpc_tests.sql` and `product_lots_tests.sql` read their own temp tables
   after switching to the `authenticated` role, which has no privilege on them.

Found by the Supabase advisors after applying:

9. `handle_new_user` and `set_updated_at` were `SECURITY DEFINER` trigger
   functions sitting in the exposed `public` schema, so PostgREST published them
   as RPCs callable by `anon`. Moved to `private` (00017).
10. Five foreign keys had no covering index, two of them on columns the UI
    filters by (00017).

The lesson is not "review is useless", it is that review found the four defects
that were visible in the text and missed the six that only a parser or a test run
can see.

### Accepted advisor findings

Deliberately left, with reasons:

- **`idempotency_keys` has RLS and no policies** (INFO). That is the design: the
  table is internal bookkeeping, unreadable and unwritable by any client. Only the
  `SECURITY DEFINER` RPCs touch it.
- **Six `SECURITY DEFINER` functions callable by `authenticated`** (WARN).
  `adjust_stock`, `checkout_sale`, `record_carnet_transaction`,
  `allocate_lots_fefo`, `get_dashboard_stats` and `get_movements_summary` are the
  public API. Each performs its own ownership check, and being callable by signed-in
  users is the entire point.
- **`rls_auto_enable` callable by `anon`** (WARN). Created by the Supabase
  platform, not by this repository.
- **Four unused indexes** (INFO). They have never been used because the database
  is empty. They exist for the query patterns the app is written against.

### Re-verification checklist

1. Apply `supabase/migrations/*.sql` in filename order (00000–00024), or run
   `supabase/all-in-one.sql` against a fresh database.
2. Run all six suites. Expect 21 / 16 / 17 / 11 / 12 / 19 — 96 assertions.
3. Run the Supabase **security** and **performance** advisors and compare against
   the accepted-findings list.
4. Regenerate the bundle after any migration change: `npm run db:bundle`.

Not yet verified: the frontend against this database. That needs a signed-up user,
so it is a manual step. The database layer is proven; the UI layer is not.

## Internationalisation

French, English and Arabic are all complete and functional, not a French app with
an Arabic placeholder.

- `src/i18n/locales/<locale>/<domain>.ts`, nine domains: core, dashboard, products,
  inventory, carnet, suppliers, reports, settings, scanner. 478 keys each, identical
  key sets across all three.
- French is the reference locale. `TranslationKey` derives from it, and each other
  locale is typed `Record<TranslationKey, string>`, so a missing translation fails
  `npm run typecheck` instead of silently showing French.
- Tests additionally catch empty values and dropped interpolation placeholders,
  which are the failure mode a type checker cannot see.
- Direction comes from `LocaleMeta`. Arabic sets `dir="rtl"`; the layout uses
  logical properties throughout and arrow-key handlers check the direction, so it
  mirrors without style changes.
- Language persists to `stores.language` on change, not on Save. `localStorage`
  decides what paints on first render; the store row is authoritative once loaded.

Adding a locale is now three steps: a directory, a `locales` entry, a `dictionaries`
entry. No component changes.

Two guards exist because the obvious tests did not catch these:

`architecture.test.ts` fails the build on any module-scope `t()` call. `t()` reads
module state when called, so a translation evaluated at import freezes the
language forever; it does not look wrong and no render test catches it.

The completeness tests caught French that had leaked into the data layer rather
than into components: option lists in `src/lib/constants.ts`, a sentence built
inside `src/lib/checkout.ts`, and CSV export headers. All of it now goes through
the dictionary.

Terminology for Arabic is a judgement call and should be reviewed by a native
speaker before launch; the choices made are recorded in the commit that added it
(carnet as الدفتر, not the loanword; بقالة for a grocery; low and out-of-stock kept
as distinct states).

Known gap: `src/pages/PrivacyPage.tsx` was French-only. It now resolves a locale
per document (`content.fr.ts` as the reference, plus `en` and `ar`) rather than
going through the UI dictionary, because a privacy policy is a legal instrument
and not a label. See `docs/LEGAL.md`.

## Decisions taken (2026-10-12)

| Decision | Rationale |
|---|---|
| Not a caisse / no invoicing | 2027 attestation obligation is uncertifiable by us |
| Local-first offline | Competitors all ship offline; M2 data shows 9-21% dead zones |
| Own sync engine, TanStack DB + Dexie | Single owner per store means no merge conflicts; a sync engine would be a collaboration tool we do not need |
| `product_lots` with FEFO | One `expiry` column cannot represent three deliveries of the same product |
| Two scan flows (sell, receive) | Different jobs: one is a basket at the counter, one is a delivery in the back room |
| Carnet and expiry over reports | The only two things the six Algerian competitors do not do well |

## Known issues (ordered by severity)

The list that follows is the historical register, kept because each entry names the
defect a test now prevents from returning. **All of 1-11 are closed and verified.**
Entry 1-6 by migration 00013 and its suites, 7-8 by 00014, 9-10 during the i18n
pass, 11 by Phase 6. The text is left as written so the assertions that cover them
can be traced back to the reasoning that produced them.

Issues found since, all fixed, are in `docs/archive/ROADMAP-NEXT.md`.

1. **CRITICAL — cross-tenant write in `checkout_sale`.** Ownership was verified
   only for the first cart line (`00010_checkout_sale_rpc.sql`, the `if
   v_store_id is null` block). Items 2..n were never ownership-checked, so an
   authenticated user could decrement another store's stock. Fixed in 00013.
2. **CRITICAL — credit checkout never updated the customer balance.** It inserted
   into `carnet_transactions` directly instead of calling
   `record_carnet_transaction`, so the balance stayed stale. Fixed in 00013.
3. **HIGH — the credit customer was never checked against the store.** Any
   authenticated user could post a transaction onto another store's customer.
   Fixed in 00013.
4. **HIGH — duplicate cart lines could drive stock negative.** Quantities were
   validated per line but decremented in a second loop. Fixed in 00013.
5. **HIGH — client-supplied `unit_price` was trusted.** Fixed in 00013: the
   server reads `products.sell_price` and the parameter is gone from the API.
6. **HIGH — no idempotency on any write RPC.** A retry or double-tap
   double-counted. Fixed in 00013 via `idempotency_keys` + `p_client_op_id`,
   asserted by `src/lib/__tests__/api.test.ts`.
7. **MEDIUM — RLS calls `auth.uid()` unwrapped and omits `TO authenticated`**
   across all 22 policies. Documented 10-100x slowdown. Fix: Phase 1b.
8. **MEDIUM — `SECURITY DEFINER` helper functions live in the `public` exposed
   schema.** The write RPCs must stay in `public` (that is where PostgREST
   exposes them, and they self-authorise), but `is_store_owner` and the guard
   triggers belong in a non-exposed `private` schema. Fix: Phase 1b.
9. **LOW — `src/lib/checkout.ts:59` builds a French sentence outside i18n.**
   FIXED: returns structured `StockShortage` records, formatted at render.
10. **LOW — `fr-pages.ts` is 281 lines** (limit 250).
    FIXED: split into nine per-domain files; the flat file no longer exists.
11. **LOW — no CI run of the SQL suite, no lint, no E2E.** Partly fixed: lint
    (`max-lines` + `jsx-a11y`) now runs in `npm run gate`. Still missing: CI on
    every commit, E2E, Playwright + axe.

## What is genuinely left

Stated plainly, because "finish everything" should not be answered by claiming
everything is finished. There is no unimplemented feature left in the plan. What
remains is the part that code cannot do.

**Needs a human, and cannot be automated:**

1. **Set the production redirect URLs in Supabase**, or password reset links point
   at `localhost`. Exact values and the reason the failure is silent are in
   [LAUNCH.md](LAUNCH.md#redirect-urls).
2. **Native-speaker review of the Arabic.** Both the interface terminology and the
   entire Arabic privacy policy were written without one. Accurate as translations,
   unverified as legal instruments.
3. **Loi 18-07 cross-border transfer position.** Requires confirming the Supabase
   hosting region against the ANPDP authorisation requirement. Not determinable
   from the code.
4. **Legal review of the translated policies.** French is the reference text.
5. **Manual phone pass.** Sign up, add a product, receive stock with a lot date,
   count the shelf, record credit, take a sale, switch all three languages, then
   repeat in aeroplane mode. The E2E suite runs against a preview server and cannot
   meaningfully take the network away.

**Deliberately not built, with reasons in LAUNCH.md:**

Full local-first reads (a data-layer rewrite, not a feature), fiscal invoicing and
card payments (out of product scope), staff roles, multi-store, billing UI, CSV
import, cookie banner.

**Design system polish** (see `DESIGN-SYSTEM.md` §5): closed. Chips, sort
indicators, sidebar group labels and the Lighthouse run are all done. What
remains is two items with reasons for not doing them, not a queue.

## Documentation drift corrected in Phase 0

- Tests are **61**, not 58 (README, AGENTS.md).
- Product image upload UI **exists** (`ProductImageUpload.tsx`), it was listed
  as pending (README roadmap, AGENTS.md).
- Migrations run 00000-00012, not 00000-00009 (AGENTS.md).
- `all-in-one.sql` and `master-schema.sql` were **missing `checkout_sale`**;
  now complete and identical. Header corrected to 00000-00012.
- `scanner.notFound` duplicated `scanner.product.notFound`; removed.
- Camera toggle labels read "Caméra" / "Caméra off"; now "Caméra active" /
  "Caméra inactive".

## Environment notes (Windows)

- Never rewrite UTF-8 files with PowerShell `Get-Content` / `Set-Content`. It
  corrupts French accents. Use the editor tools or a Node script.
- The PowerShell console cannot render `é`, `─`, `œ`. It prints `?`. Verify
  encoding with Node, never trust console output.
- Node 24.13 is installed. The committed stack (Vite 5) works. Upgrading to
  Vite 8 / Tailwind 4 / Vitest 5 is a planned Phase 6 sprint, never a
  side effect of other work.