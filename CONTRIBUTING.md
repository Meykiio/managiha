# Contributing to Managiha

Thanks for wanting to help. Managiha is a small, deliberately narrow tool, and
the constraints below are what keep it that way. They are not style preferences —
most of them exist because ignoring them caused a real bug.

## Before you start

For anything larger than a typo, **open an issue first**. It is much easier to
agree on the shape of a change than to unpick one, and several features are out
of scope on purpose (see "Out of scope" below). A pull request that adds an
out-of-scope feature will be declined regardless of quality.

## The rules that are not negotiable

### 1. Stock and balances are never written by the app

`products.current_stock`, `product_lots.quantity` and `carnet_customers.balance`
change **only** through the Postgres functions `adjust_stock()`, `checkout_sale()`
and `record_carnet_transaction()`. Guard triggers reject a direct authenticated
write, so this is enforced, not requested.

The practical consequence: **never compute a final stock or balance in the
frontend.** Send the intent — a delta, or an absolute counted quantity — and let
the server do the arithmetic under a row lock. Two screens computing the same
total from stale reads is how a shop loses money without noticing.

### 2. Soft delete only

Everything is archived via `archived_at`. There is no hard-delete affordance
anywhere, and no `DELETE` policy on any table. A shop's history is its record.

### 3. History is immutable

`stock_movements` and `carnet_transactions` have no `UPDATE` and no `DELETE`
policies. A correction is a **new** movement, never an edited one.

### 4. Every user-facing string goes through the dictionary

All UI text is resolved with `t("key")` from `src/i18n/`. French is the reference
locale in `src/i18n/locales/fr/`; the other locales are typed
`Record<TranslationKey, string>`, so a missing key is a compile error rather than
a French string shown to an Arabic speaker.

**Never call `t()` at module scope.** It resolves against module state when
called, so a module-level `t()` freezes the language at import. This is not
hypothetical — it silently broke the dashboard badges and the whole stock tab bar
in Arabic. `src/i18n/__tests__/architecture.test.ts` fails the build if you do it.

Never put a translated label on a data structure in `src/lib/`. Carry a
`TranslationKey` and resolve it at render.

### 5. Layout stays RTL-safe

Use logical CSS properties: `ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`.
Never `pl-*` / `left-*` for something that should mirror. Any keyboard-navigation
handler must check `document.documentElement.dir`.

### 6. Files stay under 250 lines

Enforced by ESLint `max-lines`. When a page approaches the limit, extract a
component rather than compressing the code. The limit exists because every file
that has passed it in this project became a hub that was hard to change safely.

### 7. Relative dates and money come from the helpers

Money is displayed with `fmtMoney*` from `src/lib/format.ts` (French grouping).
Numeric inputs carry `suffix="DZD"`. Status is always text plus a colour dot
(`<Badge tone={...} dot>`) — never colour alone.

## Before you open a pull request

```bash
npm run gate        # lint + typecheck + tests + build
npm run gate:all    # the above + Playwright/axe end-to-end + knip
```

Both must pass. If you changed anything under `supabase/`:

1. Regenerate the bundle: `npm run db:bundle`
2. Run all six SQL suites in `supabase/tests/` against a real project. They are
   manual by design — local Docker was declined — and they self-clean.

Running those suites is not a formality. They have found defects that four rounds
of code review missed, including a sale that recorded no price and so earned
nothing. Read them as the specification they are.

## Commit style

Conventional commits: `feat(scope)`, `fix(scope)`, `docs`, `test`, `chore`.

Write the *why*, not the *what*. The diff already shows what changed. A message
that explains the reasoning is worth ten that restate the diff, and it is the
only part of the change that will still be useful in a year.

## Adding a dependency

Almost certainly don't. The runtime dependencies are React, react-router,
Supabase, lucide-react, clsx, html5-qrcode and Sentry, and that list is short on
purpose — this is a tool a shop owner runs on a cheap Android phone on a bad
connection. Open an issue explaining what the dependency buys, with the bundle
cost, and expect the answer to be "write the forty lines instead".

## Out of scope — do not build these

Managiha is a **back-office tool, not a point of sale**. Adding any of the
following turns it into a "système de caisse", which from 2027-01-01 obliges the
owner to hold an inaltérabilité attestation this project cannot certify:

- Fiscal invoicing, fiscal tickets, TVA breakdown, timbre
- Card payments or any payment terminal integration
- A caisse closure / till reconciliation (opening float, cash count, écart)
- Staff roles, permissions, multi-store
- Subscription billing

Also out of scope: CSV **import** (export only), decorative charts, Arabic as a
functional locale (the structure is there; the copy is not reviewed), and any
hard-delete affordance.

## Reporting a bug

Open an issue with what you did, what happened, and what you expected. If it is
security-related, do **not** open a public issue — see [SECURITY.md](SECURITY.md).

## License

By contributing you agree your work is licensed under the
[GNU GPL v3.0 or later](LICENSE), the same terms as the project.
