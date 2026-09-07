# Managiha - Production Readiness Plan

**Date:** 7 Sep 2026. **Method:** full codebase audit (verified by grep/read of current code, not memory) using the `audit` skill dimensions plus production-readiness checks, cross-referenced with mattpocock/skills (grill/tdd/code-review discipline), addyosmani/agent-skills (ship/observability/security gates), and Supabase Postgres best practices. Every finding below cites reality. The 58 vitest tests and the 19-assertion SQL suite were green at audit time.

---

## 1. Audit scores (audit skill dimensions)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2/4 | Modals have no focus trap/restore; comboboxes are mouse-only |
| 2 | Performance | 2/4 | No route code splitting (145 KB gzip single chunk); no PWA |
| 3 | Theming | 2/4 | Light-only by design; status colors are raw classes, not tokens |
| 4 | Responsive | 3/4 | Strong mobile shell; dense tables rely on scroll (acceptable) |
| 5 | Anti-patterns | 4/4 | Calm single-accent SaaS, no AI-slop tells, text+dot badges, tnum |
| **Total** | | **13/20** | **Acceptable - significant work needed (this plan)** |

## 2. Findings by severity (all verified in code or on the live deployment)

**P0 - breaks production use now**
- F01 Vercel SPA rewrite missing: deep links on managiha.vercel.app return 404 (verified: `/carnet` -> 404). This also 404s the password-reset email link (`/reset-password`). No `vercel.json` in repo.
- F02 Auth redirect allow-list may only contain localhost; production reset link can break even after F01 (verify in Supabase Auth URL config).

**P1 - must fix before real users**
- F03 No React ErrorBoundary: any render crash = white screen (we hit exactly this class of bug once already). File: none exists.
- F04 Dashboard catch swallows all errors and shows fake zeros (`DashboardPage.tsx:71`) - a lying KPI is worse than an error for a shop owner checking stock value.
- F05 MovementsReport fetches a date range unbounded (`MovementsReport.tsx:30`, no `.range()`): a 1-year range can pull tens of thousands of rows.
- F06 No CI: nothing runs typecheck/tests on push; regressions to the public demo are silent.
- F07 Modal focus: no trap, no restore, no initial focus (`Modal.tsx`) - keyboard users get stranded. WCAG 2.4.3.
- F08 No privacy policy page while collecting carnet PII (Loi 18-07 amended by 25-11 applies; also Supabase ToS expects one for production auth).

**P2 - quality for real life**
- F09 History pagination missing: product movements capped at 50, customer transactions at 100, no paging (ProductDetailPage, CustomerDetailPage).
- F10 Category management absent (create-only, no rename/archive).
- F11 "sale" movement type exists in DB and RPC but has no UI: stock truth degrades without a fast sale decrement. Product decision required.
- F12 Expiry date field exists but is never surfaced (no expiring-soon report/badge) - matters for food retail.
- F13 Product image upload UI missing while bucket + hardened policies sit unused.
- F14 No PWA manifest/OG tags/theme-color: mobile-first Algeria, installable app is cheap and high value.
- F15 Offline flakiness invisible: no connection-loss feedback during mutations.
- F16 Settings profile save does `window.location.reload()` (SettingsPage.tsx:80) - jarring.
- F17 i18n partially centralized: a handful of inline FR strings remain (combos, confirm bodies) - blocks Arabic later.
- F18 No error tracking (Sentry free tier is enough at this scale).
- F19 No route code splitting; supabase-js ships in the single bundle.
- F20 Comboboxes (ProductSelect, CustomerSelect, CategoryCombo) mouse-only.

**P3 - later**
- F21 Dark mode (deliberate non-goal for v1, keep on roadmap).
- F22 trgm index for product search ilike (fine below thousands of rows per store).
- F23 Whole-store data export (reports cover per-table CSV).
- F24 Carnet statement (full history) WhatsApp share vs current reminder-only.
- F25 engines/node pinning, Dependabot.

## 3. Sprints

Each sprint ships, commits (conventional commits), and passes its gate before the next starts. UI stays simple: no new nav items except Privacy in the auth footer.

### Sprint 0 - Unbreak the deployed app (half day)
- [x] `vercel.json` with SPA rewrite `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`; redeploy; verify `/carnet`, a product deep link, and `/reset-password` on production
- [x] Supabase Auth URL config: add `https://managiha.vercel.app/reset-password` to redirect allow-list (F02)
- [x] React `ErrorBoundary` at root with FR fallback (reload button), report to console now, Sentry in Sprint 4
- [x] Dashboard: on fetch failure show an explicit error state with Retry (reuse StoreMissing pattern), never fake zeros (F04)
- [x] GitHub Actions CI: on push/PR run `npm ci && npm run typecheck && npm test` (F06)
- Gate: deep links work on prod, boundary renders in a forced test, CI green on GitHub. **PASSED 7 Sep 2026: /carnet, /reset-password, /products/x all 200 on production; CI run 34141265286 green in 38s.**

### Sprint 1 - Truth in the numbers (1 day)
- [x] MovementsReport: server-side pagination with PAGE_SIZE + range cap (F05)
- [x] Product movements history: paginated (F09)
- [x] Customer transactions: paginated (F09)
- [x] grep gate: no unbounded `.select(` without `.range`/`.limit` on data tables
- Gate: vitest 58+ green, SQL suite 19/19, reports still export CSV correctly. **PASSED 7 Sep 2026 (partial): vitest 58/58, all data queries bounded (manual audit: every .select has range/limit or is single-row; caps added to categories 500, suppliers 500, carnet outstanding 2000), movements summary now computed server-side by new RPC 00010. SQL suite deferred until the new Supabase project exists (owner deleted the old one; run all-in-one + tests/rls_rpc_tests.sql + seed-demo.sql at setup).**

### Sprint 2 - Real-life flows (1-2 days)
- [ ] DECISION (do first): minimal "Vente" quick action - product + qty (+ optional note) calling `adjust_stock('sale')`. No cart, no totals, no payments (stays out of POS). If No: remove 'sale' from UI constants and document. (F11)
- [ ] Category management: rename + archive modal from the Products filter (F10)
- [ ] Expiry: "expire sous 30 jours" filter in Reports + badge on ProductSummary (F12)
- [ ] Onboarding: "Charger des donnees d'exemple" button on empty dashboard (SQL function seeded through the RPCs, respects invariants) (adoption)
- [ ] Settings: replace `window.location.reload()` with context refresh (F16)
- Gate: new forms tested (fake supabase pattern), SQL suite extended if schema/functions touched.

### Sprint 3 - Fast and accessible (1 day)
- [ ] Route code splitting: React.lazy per page + Suspense; manualChunks vendor/supabase (F19); verify first-load gzip drops meaningfully
- [ ] Modal: focus trap, restore, initial focus (F07)
- [ ] Combobox keyboard nav: arrows/enter/escape on ProductSelect, CustomerSelect, CategoryCombo (F20)
- [ ] PWA manifest + theme-color + OG/meta tags (F14)
- [ ] Offline banner: navigator.onLine listener + toast on failed mutation (F15)
- [ ] i18n sweep: move remaining inline FR strings into dictionaries (F17)
- Gate: Lighthouse mobile perf >= 90 and a11y >= 90 on production; keyboard-only walkthrough of one full flow passes.

### Sprint 4 - Secure and legal (1 day)
- [ ] Privacy page `/privacy` (FR, cites Loi 18-07 modifiee par 25-11), linked in auth footer + Settings; account data export button (CSV bundle) (F08)
- [ ] Supabase dashboard hardening: leaked password protection ON, password min 8, rate limits reviewed; SMTP decision documented (custom SMTP or keep confirm-email off); CAPTCHA stays optional off (F18-adjacent, config only)
- [ ] Product image upload: file input + validate (20MB, png/jpeg/webp per bucket policy 00007), upload to `{storeId}/{productId}/`, signed URL display, delete-old-object on replace (F13)
- [ ] Sentry (free tier): ErrorBoundary + global handler + RPC failures (F18)
- Gate: privacy page live; upload/replace/remove works; SQL suite green (extend with a storage negative test if cheap).

### Sprint 5 - Prove it and ship it (1 day)
- [ ] Playwright E2E smoke vs Vercel preview: demo login -> dashboard -> add product -> receive -> carnet entry -> WhatsApp link present (uses demo@managiha.app)
- [ ] Docs to the 5-file standard: PROJECT_STRUCTURE.md, DATABASE.md, FEATURES.md, CHANGELOG.md (+ this file + STATUS.md refreshed) - keep each under 250 lines
- [ ] Demo data reset script (SQL) documented for the maintainer
- [ ] Re-run the audit: target >= 16/20; launch checklist (uptime monitor free tier, Dependabot on)
- Gate: E2E green on preview, audit re-scored, CHANGELOG written, tag `v1.0.0`.

## 4. Out of scope (protects simplicity)

Dark mode, Arabic functional UI, POS/cart/payments, multi-store, offline sync, realtime, CSV import, billing UI, decorative charts, any hard delete.

## 5. Decision queue (answer before the sprint that needs it)

1. Sale flow: minimal Vente (recommended) or remove from UI constants? -> Sprint 2
2. SMTP: custom provider now or keep confirm-email off with docs? -> Sprint 4
3. Demo isolation: public sandbox account stays on the same Supabase project until first real store signs up, then split to a dedicated demo project (recommended) -> revisit at Sprint 5