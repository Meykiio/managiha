# Project structure

Where things live, and the rules for where new things should go.

```
managiha/
├── .github/
│   ├── workflows/ci.yml            lint, typecheck, test, build, e2e
│   ├── workflows/security-scan.yml semgrep, trivy
│   └── dependabot.yml
├── docs/                           see docs/README.md for the index
├── e2e/                            Playwright: accessibility, theme, locale, routing
├── public/                         favicon, web manifest
├── scripts/
│   ├── build-schema-bundle.mjs     regenerates supabase/all-in-one.sql
│   ├── split-fr-dictionary.mjs     one-off: split the FR locale into domains
│   └── load-test.js                k6
├── src/
│   ├── components/                 see the map below
│   ├── contexts/                   Auth, Theme, Toast
│   ├── hooks/
│   ├── i18n/
│   │   ├── index.ts                t(), locale store
│   │   ├── LocaleProvider.tsx
│   │   └── locales/{fr,en,ar}/     nine domain files per locale
│   ├── lib/                        data layer and pure helpers
│   │   └── offline/                the write queue
│   ├── pages/                      one directory per route
│   ├── test/                       vitest setup + the fake Supabase client
│   ├── App.tsx                     routes
│   ├── main.tsx                    bootstrap, Sentry, theme
│   └── index.css                   design tokens + the few global utilities
├── supabase/
│   ├── migrations/                 applied in filename order
│   ├── tests/                      six SQL suites, 96 assertions
│   ├── all-in-one.sql              generated; NOT idempotent
│   ├── master-schema.sql           generated; identical to the above
│   └── seed-demo.sql               the public demo store
└── AGENTS.md                       guidance for AI agents working in this repo
```

## `src/lib/` — the data layer

This directory is deliberately flat and small, and the split is by *kind of work*,
not by feature. Keeping it that way is what stops "where does this query go?"
becoming a question.

| File | Holds | Rule |
|---|---|---|
| `supabaseClient.ts` | The client, and `isSupabaseConfigured` | The only place the client is constructed |
| `api.ts` | **All reads** | Never writes. Re-exports the write RPCs for convenience |
| `rpc.ts` | **All write RPCs** | Every mutating call in the app goes through this file |
| `lots.ts` | Lot and expiry reads | Read-only; `product_lots` has no write policy at all |
| `insights.ts` | Report RPCs | Sales, dead stock, reorder |
| `productImages.ts` | Storage upload/delete | Split out of `api.ts` when it hit the line limit |
| `offline/` | The write queue | `queue.ts` (IndexedDB), `submit.ts` (the retry decision), `useOfflineQueue.ts` |
| `types.ts` | Shared types | |
| `constants.ts` | `PAGE_SIZE`, reason lists, markers | **Never a translated string** — carry a `TranslationKey` instead |
| `format.ts` | Money, dates, quantities, `wa.me` | |
| `csv.ts` | CSV building | BOM + `;` for French Excel |
| `margin.ts` | `computeMargin` | Rate is on the sell price, not markup. Null when cost is unknown |
| `stockStatus.ts` | Status thresholds | Must match the SQL view exactly; a test asserts the boundary |
| `checkout.ts` | Cart validation | |
| `expiry.ts`, `ids.ts`, `utils.ts`, `sampleData.ts` | | |

**The rule that matters:** if it writes, it is in `rpc.ts`. If it reads, it is in
`api.ts` or one of the read modules. Nothing else talks to Supabase.

## `src/components/`

| Directory | Contents |
|---|---|
| `ui/` | The kit: `Button`, `Card`, `Modal`, `Input`, `Select`, `Textarea`, `Badge`, `Chip`, `Tabs`, `Pagination`, `EmptyState`, `Spinner`, `PageHeader`, `ConfirmDialog`, `MetricCard`, `SortableHeader`, `Stat`, `Sparkline`, `ErrorBoundary` |
| `layout/` | `AppLayout`, `Sidebar`, `Topbar`, `ProfileMenu`, `ThemeToggle`, `OfflineBanner`, `Logo` |
| `products/` | Table, filters, form fields, form modal, detail modals, summary, lots, movements, image upload, category combo |
| `inventory/` | `ReceiveStockForm`, `AdjustStockForm`, `SellStockForm`, `StockCountTab`, their modals, `ProductSelect` |
| `carnet/` | Entry form/modal, customer form, `CustomerSelect`, `CustomerName`, `TransactionHistory`, `CustomerDataRights` |
| `reports/` | `ExpiryTable` and report-specific tables |
| `dashboard/` | `DashboardMetrics`, `NeedsAttention`, `ExpiryAlert`, the two feeds, `CreditHero`, `EmptyStoreCard` |
| `scanner/` | `BarcodeScanner`, `ProductSearchBar`, `CartLines`, payment modals, `ReceiptSummary` |
| `settings/` | `PasswordCard`, `AboutCards` |
| `suppliers/` | `SuppliersTable`, `SupplierFormModal` |

Components carry the `__tests__/` directory beside them when they have one.

## `src/pages/`

One directory per route, with a file per screen. A page is a **composition**: it
owns the loader, the filters and the modal state, and delegates rendering.
Anything that grows past ~250 lines gets extracted into `components/`, which is
why there are `ProductsModals.tsx` and `ProductDetailModals.tsx` — not because
modal code is special, but because those pages hit the limit.

Server-side pagination is the default for any list: `PAGE_SIZE` (20) from
`constants.ts`, `count: "exact"`, `.range()`. A table never renders more than
twenty rows.

## `src/i18n/`

```
locales/fr/{core,products,inventory,reports,dashboard,carnet,scanner,settings,legal}.ts
```

Nine domain files per locale. French is the reference: its keys are the
`TranslationKey` union, and every other locale is typed
`Record<TranslationKey, string>` — so **a missing key is a TypeScript error**, not
a French string shown to an Arabic speaker.

Two rules that are enforced by a test:

1. **Never call `t()` at module scope.** It resolves against module state when
   called, so a module-level `t()` freezes the language at import time. This
   silently broke the dashboard badges and the whole stock tab bar in Arabic.
   `src/i18n/__tests__/architecture.test.ts` fails the build if you do it.
2. **Never put a translated label on a data structure in `lib/`.** Carry a
   `TranslationKey` and resolve it at render.

## `src/test/`

`fakeSupabase.ts` models the parts of the Supabase client the components use —
including `.single()` / `.maybeSingle()` unwrapping — so component tests can
assert *which RPC was called* and, more importantly, that **no direct write to
`current_stock` or `balance` ever happens**.

## The 250-line limit

ESLint `max-lines` at 250, applied to every file in `src/`. It is not a style
preference. Every file in this project that passed it became a hub that was hard
to change safely, and the fix — extract a component — is nearly always an
improvement. When you hit it, extract; do not compress.

## Adding a screen

1. `src/pages/<area>/<Name>Page.tsx`, composed from `components/ui/`.
2. Register the route in `App.tsx` (lazy-loaded).
3. Add it to `Sidebar.tsx` if it belongs in the nav.
4. Data access goes in `lib/`, never inline in the page.
5. Every string through `t()`, in all three locales.
6. Logical CSS properties only.
