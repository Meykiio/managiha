# LATER.md

Ideas deliberately parked. Anything here needs Sifeddine's approval before it
enters a sprint. Nothing here is a commitment.

## Product

- **Supplier purchasing** (bons de commande, purchase history, price comparison).
  All six Algerian competitors have it. Out of v2 scope, not out of value.
- **Margins and profitability per product.**
- **Multi-store / multi-branch.**
- **Staff roles with limited permissions.** Currently one owner per store, which
  is what makes local-first simple. Do not add without redesigning conflict
  resolution.
- **Native-speaker review of the Arabic locale.** The dictionary is complete and
  functional, but the terminology (الدفتر for carnet, بقالة for grocery) is a
  judgement call made without a native reviewer. Ship-blocking for the Arabic
  audience, cheap to fix before launch.
- **History pagination.** Movements capped at newest 50, transactions at 100.
  Revisit when a real shop complains, not before.

## Compliance

- **Fiscal invoicing (DE 05-468).** 19 mandatory mentions, TVA 19/9%, continuous
  chronological numbering, amount in words, 10-year retention. A legal product,
  not a feature.
- **Electronic invoicing** (XML, JIBAYA'TIC). Phased in 2026-2029 by the DGI.
  `sale_documents` with a per-store sequence lands in Phase 2 as the numbering
  spine so this is addable later without a migration crisis.
- **Online payments.** Loi 18-05 requires a Satim-certified gateway for Algerian
  residents. Not viable with Stripe.

## Engineering

- **Stack upgrade** to React 19, Tailwind 4 (needs `@config` to keep the
  `primary-*` palette), Vite 8 (Rolldown, `codeSplitting` replaces object-form
  `manualChunks`), Vitest 5, react-router 7. Phase 6, isolated, never as a side
  effect of other work.
- **Enforce the 250-line rule** with ESLint `max-lines`. DONE in Phase 4: the rule
  is wired into `npm run gate` and immediately caught a file already over it.
- **k6 load test.** Only if real traffic is expected.
- **ZAP scan** against staging only, before launch.

## Watch list

- **Translated privacy policy.** `src/pages/PrivacyPage.tsx` is French, body
  included. Deliberately kept out of the locale dictionaries: it is a legal
  document, and machine-translated legal text is worse than a monolingual one.
  Belongs with the Phase 5 legal pack, which needs a qualified reviewer anyway.
- **Lot history in the UI.** `product_lots` and FEFO are built (migration 00016)
  and the client can read lots, but the stock and receive screens still show only
  a single product-level expiry date. Surfacing per-lot expiry in the receive flow
  is what makes FEFO useful to a shopkeeper, and it should wait until 00016 has run
  against a real database.
- Differential sync / change feed. Deliberately not built: a full snapshot is
  ~150-400 KB for a realistic catalogue. Revisit above ~20,000 products.