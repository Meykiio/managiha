# Managiha Codebase Audit

## P0 — Critical

### 1. Hardcoded French strings (i18n violation)
**Files:** ProductFormFields.tsx, SellStockForm.tsx, AdjustStockForm.tsx, CarnetEntryForm.tsx, AuthContext.tsx, ToastContext.tsx, LoginPage.tsx, SignupPage.tsx, HistoryTab.tsx, constants.ts, MovementsReport.tsx, ExpiryReport.tsx
**Issue:** ~30 inline French strings instead of `t()` calls. Breaks RTL/i18n architecture (AGENTS.md rule #4).
**Fix:** Add keys to fr-core.ts/fr-pages.ts, replace all hardcoded strings.

### 2. AuthContext infinite retry risk
**File:** src/contexts/AuthContext.tsx:96-99
**Issue:** If `refreshSession()` fails, retry executes before `signal.cancelled` check. No backoff.
**Fix:** Guard retry with signal check before calling.

### 3. PrivacyPage entirely hardcoded French
**File:** src/pages/PrivacyPage.tsx
**Issue:** Legal document not using `t()`. Full rewrite needed for Arabic.
**Fix:** Either accept French-only for legal docs, or add i18n keys.

---

## P1 — High

### 4. Skeleton export name collision
**File:** Spinner.tsx exports Skeleton, but Skeleton.tsx doesn't exist as separate file.
**Fix:** Move Skeleton to its own file or document the pattern.

### 5. ProductsTable N+1 image fetch
**File:** ProductsTable.tsx:13-34
**Issue:** Each row fires a `getProductImageUrl()` call. 20 products = 20 storage API calls.
**Fix:** Batch-fetch or cache signed URLs.

### 6. CategoryCombo hardcoded ID collision
**File:** CategoryCombo.tsx:88-101
**Issue:** `id="category-combo"` not unique if multiple instances exist.
**Fix:** Use `useId()` hook.

### 7. ProductSelect/CustomerSelect missing proper labels
**Files:** ProductSelect.tsx:90, CustomerSelect.tsx
**Issue:** Uses `<span>` or no label — clicking doesn't focus input.
**Fix:** Use `<label htmlFor>`.

### 8. Tabs missing role="tabpanel"
**File:** Tabs.tsx:17
**Issue:** `role="tablist"` present but no `role="tabpanel"` with `aria-labelledby`.
**Fix:** Add proper ARIA attributes.

### 9. DashboardPage STATUS_LABEL.healthy empty
**File:** DashboardPage.tsx:28-32
**Issue:** `healthy: ""` should be `t("products.status.healthy")`.

### 10. ProductFilters module-level t() calls
**File:** ProductFilters.tsx:22-26
**Issue:** Labels computed at import time, won't update if language changes.

### 11. supabaseClient placeholder values
**File:** supabaseClient.ts:8-11
**Issue:** Creates client with placeholder URL/key when env vars missing. Silent failures.
**Fix:** Fail fast with clear error.

### 12. SettingsPage no validation on store save
**File:** SettingsPage.tsx:42-65
**Issue:** `handleSaveStore` doesn't validate storeName is non-empty.

### 13. CarnetEntryForm redundant state
**File:** CarnetEntryForm.tsx:31
**Issue:** `useState(!presetCustomerId ? false : false)` always false.

### 14. AuthContext mapAuthError hardcoded
**File:** AuthContext.tsx:45-58
**Issue:** Auth error messages in French, not using `t()`.

---

## P2 — Medium

### 15. ProductFormFields unused productId prop
**File:** ProductFormFields.tsx:43
**Issue:** Prop declared but never used.

### 16. ProductFormFields supplier fetch swallowed error
**File:** ProductFormFields.tsx:60-63
**Issue:** `.catch(() => setSuppliers([]))` silently swallows error.

### 17. CarnetFeed uses signedQty for money
**File:** CarnetFeed.tsx:4,42
**Issue:** Uses `signedQty` (quantities) instead of `signedAmount` (money).

### 18. AdjustStockForm duplicate imports
**File:** AdjustStockForm.tsx:10-12
**Issue:** Two separate imports from constants.

### 19. fr-pages.ts exceeds 250 lines
**File:** src/i18n/fr-pages.ts — 278 lines
**Issue:** Over the 250-line limit (data file, not component).

### 20. CSV separator semicolon
**File:** csv.ts:8
**Issue:** Uses `;` — French Excel convention but breaks English tools.

### 21. ProfileMenu missing aria-label
**File:** ProfileMenu.tsx:33-41
**Issue:** Button shows initials but no accessible name.

### 22. AppLayout no scroll restoration
**File:** AppLayout.tsx
**Issue:** No `ScrollRestoration` — users lose scroll position on back navigation.

### 23. ExpiryReport shadows global window
**File:** ExpiryReport.tsx:17,22
**Issue:** `const [window, setWindow]` shadows global `window`.

### 24. DashboardPage race condition
**File:** DashboardPage.tsx:47-78
**Issue:** 4 parallel requests without cancellation signal.

### 25. ProductImageUpload signed URL flash
**File:** ProductImageUpload.tsx:60-61
**Issue:** Immediate signed URL request after upload may be stale.

---

## P3 — Low

### 26. stockStatus.ts only used in ProductSummary
**Issue:** Minor inconsistency — other components use `stock_status` from view.

### 27. sampleData.ts current_stock direct write
**File:** sampleData.ts:24
**Issue:** Sets `current_stock: 0` directly, then uses RPC. Guard triggers should catch.

### 28. vite.config.ts no Sentry sourcemaps
**Issue:** `@sentry/vite-plugin` installed but not configured.

### 29. package.json version mismatch
**Issue:** `"version": "0.1.0"` but SettingsPage shows `"v1.0.0"`.

### 30. ConfirmDialog no auto-focus on confirm
**Issue:** Modal focus trap works but confirm button not auto-focused.

### 31. Modal backdrop dismissal during submit
**Issue:** Clicking backdrop closes modal even when form is submitting.

### 32. OfflineBanner doesn't prevent actions
**Issue:** Shows banner but doesn't disable save buttons.

### 33. CarnetEntryForm missing adjustment type
**Issue:** Only offers credit/payment, not adjustment.

---

## Missing Error Boundaries

Only one global ErrorBoundary in App.tsx. A crash in any page takes down the entire app. Consider per-page ErrorBoundaries for lazy-loaded routes.

## Missing Loading/Error/Empty States

All pages have proper loading, error, and empty states. No gaps found.

## Accessibility Summary

| Issue | Severity |
|-------|----------|
| Tabs missing role="tabpanel" | P1 |
| CategoryCombo hardcoded ID | P1 |
| ProductSelect/CustomerSelect missing proper labels | P1 |
| ProfileMenu missing aria-label on trigger | P2 |
| Modal backdrop dismissal during submit | P3 |

## File Size Report

| File | Lines | Status |
|------|-------|--------|
| src/i18n/fr-pages.ts | 278 | Over 250 limit |
| All other files | < 250 | OK |
