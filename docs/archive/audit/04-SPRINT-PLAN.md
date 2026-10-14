# Managiha Launch Sprint Plan

**Goal:** From current state (Sprint 4 done) to production-ready launch with barcode scanner as a togglable feature.

**Principle:** Scanner is a feature that integrates into the existing app. Dashboard stays. All existing flows remain. Scanner adds a scan-to-cart quick action mode.

---

## Sprint 5: Barcode Scanner Core (The Big One)

**Duration:** 3-4 days
**Goal:** User can scan a product barcode with phone camera, look up the product, and perform quick actions — all within the existing InventoryPage.

### 5.1 — Install html5-qrcode & Foundation
- [ ] `npm install html5-qrcode`
- [ ] Add `barcode` column to `products` table (migration 00010)
- [ ] Create RPC `lookup_product_by_barcode(barcode_text)` — returns product + current_stock
- [ ] Add index on `products.barcode` for fast lookups
- [ ] Update `all-in-one.sql` with new migration

### 5.2 — Scanner Components
- [ ] Create `src/components/scanner/BarcodeScanner.tsx` — camera view with html5-qrcode
- [ ] Create `src/components/scanner/ScanResult.tsx` — product card after scan (name, price, stock, action buttons)
- [ ] Create `src/components/scanner/ScanCart.tsx` — cart with quantity controls, running total, action buttons
- [ ] Create `src/hooks/useBarcodeScanner.ts` — scanner lifecycle, cooldown logic (2s per barcode)
- [ ] Create `src/hooks/useScanCart.ts` — cart state management (add, remove, update qty, clear)

### 5.3 — Scanner Mode in InventoryPage
- [ ] Add "Scanner" tab to InventoryPage (first tab, default when opening)
- [ ] Create `src/pages/inventory/ScannerTab.tsx` — scanner mode view
- [ ] Layout: camera top 40%, cart panel bottom 60% with rounded overlap
- [ ] Manual barcode input field below camera (for external scanners / fallback)
- [ ] Cart panel: item list with +/- controls, running total, Vendre/Réceptionner buttons
- [ ] Empty state: "Scannez un produit pour commencer"

### 5.4 — Scan Actions
- [ ] After scan: auto-add to cart (qty=1), or increment if already in cart
- [ ] Cooldown: 2s per identical barcode to prevent rapid-fire
- [ ] Vibration feedback on successful scan (mobile)
- [ ] "Produit non trouvé" state: offer to create new product with barcode pre-filled
- [ ] Quick sell: scan → adjust qty → Vendre → stock updated via RPC
- [ ] Quick receive: scan → adjust qty → Réceptionner → stock updated via RPC

### 5.5 — External Scanner Support
- [ ] Detect rapid keyboard input as barcode scan (8-13 digits in <500ms)
- [ ] Auto-lookup on external scanner input
- [ ] Works in scanner mode (not global, to avoid interference)

### 5.6 — i18n & Polish
- [ ] Add scanner-related French strings to `fr-core.ts` and `fr-pages.ts`
- [ ] Camera on/off toggle in scanner header
- [ ] Sound feedback option in settings
- [ ] Error states: camera permission denied, scanner failed, product lookup error

**Deliverable:** Scanner tab in InventoryPage with camera scan, manual input, cart, and quick actions.

---

## Sprint 6: Barcode in Product Forms & Polish

**Duration:** 2 days
**Goal:** Products can have barcodes. Barcode field in forms. Scan-to-find in Products page.

### 6.1 — Product Barcode Field
- [ ] Add `barcode` field to ProductFormFields (optional, text input)
- [ ] Add barcode to ProductFormModal payload (create + edit)
- [ ] Add barcode column to ProductsTable (hidden on mobile, visible on desktop)
- [ ] Barcode display in ProductSummary detail sidebar

### 6.2 — Products Page Scanner
- [ ] Add scanner icon button next to search field (like Flutter app)
- [ ] Clicking scanner icon opens camera overlay
- [ ] Scanned barcode auto-fills search field
- [ ] If product found: scroll to / highlight that product in table

### 6.3 — Open Food Facts Fallback
- [ ] When product not found by barcode, query Open Food Facts API
- [ ] Pre-fill product name, image from API response
- [ ] User confirms and creates product

**Deliverable:** Products have barcodes. Scanner works in Products page for quick lookup.

---

## Sprint 7: Audit Fixes & Polish

**Duration:** 2-3 days
**Goal:** Fix all P0/P1 audit issues. Polish accessibility, i18n, error handling.

### 7.1 — i18n Fixes (P0)
- [ ] Add missing i18n keys for all hardcoded French strings (~30 strings)
- [ ] Replace all inline French with `t()` calls
- [ ] Fix fr-pages.ts line count (split if needed)

### 7.2 — Accessibility Fixes (P1)
- [ ] Add `role="tabpanel"` + `aria-labelledby` to Tabs component
- [ ] Use `useId()` in CategoryCombo for unique IDs
- [ ] Fix ProductSelect/CustomerSelect label associations
- [ ] Add aria-label to ProfileMenu trigger
- [ ] Auto-focus confirm button in ConfirmDialog

### 7.3 — Performance Fixes (P1)
- [ ] Fix ProductsTable N+1 image fetch (batch or cache)
- [ ] Fix DashboardPage race condition (add cancellation)
- [ ] Add scroll restoration to AppLayout

### 7.4 — Error Handling (P1)
- [ ] Fix AuthContext retry guard (check signal before retry)
- [ ] Add per-page ErrorBoundary for lazy routes
- [ ] Fix supabaseClient to fail fast when env vars missing
- [ ] Show error toast when supplier fetch fails

### 7.5 — Code Quality (P2)
- [ ] Remove unused props (ProductFormFields.productId)
- [ ] Fix CarnetFeed signedQty → signedAmount
- [ ] Fix ExpiryReport window variable shadowing
- [ ] Remove duplicate imports
- [ ] Fix CarnetEntryForm redundant state
- [ ] Fix package.json version to match SettingsPage

**Deliverable:** Clean, accessible, performant codebase. All P0/P1 issues resolved.

---

## Sprint 8: Offline & PWA Polish

**Duration:** 2 days
**Goal:** Make the app work reliably offline. PWA installable.

### 8.1 — Service Worker
- [ ] Add workbox-based service worker for offline caching
- [ ] Cache product images for offline access
- [ ] Cache product list for offline barcode lookup
- [ ] Background sync for pending stock adjustments

### 8.2 — Offline Scanner
- [ ] Scanner works offline (camera + local DB lookup)
- [ ] Queue actions when offline (sell/receive/adjust)
- [ ] Sync when connection restored
- [ ] Show pending actions count

### 8.3 — PWA Manifest
- [ ] Update manifest with proper icons (192x192, 512x512)
- [ ] Add splash screen
- [ ] Test installability on Android
- [ ] Add "Add to Home Screen" prompt

**Deliverable:** App is installable, works offline, scanner functions without internet.

---

## Sprint 9: E2E Testing & Documentation

**Duration:** 2-3 days
**Goal:** Comprehensive E2E tests. Updated documentation.

### 9.1 — Playwright E2E Tests
- [ ] Scanner flow: open camera → scan → product found → sell → stock updated
- [ ] Scanner flow: open camera → scan → product not found → create product
- [ ] External scanner: type barcode → product found → action
- [ ] Manual input: type barcode → lookup → action
- [ ] Product CRUD: create → edit → archive → restore
- [ ] Carnet: create customer → credit → payment → balance check
- [ ] Auth: signup → login → logout → session refresh
- [ ] Offline: disconnect → scan → action queued → reconnect → sync

### 9.2 — Documentation
- [ ] Update README with scanner feature
- [ ] Add user guide for barcode scanning
- [ ] Add developer guide for scanner integration
- [ ] Update AGENTS.md with scanner architecture

### 9.3 — SQL Tests
- [ ] Verify RPC functions work with new barcode lookup
- [ ] Test RLS policies for new functions
- [ ] Run full test suite (should stay 61/61 + new E2E)

**Deliverable:** Comprehensive test coverage. Clear documentation.

---

## Sprint 10: Launch Prep

**Duration:** 2 days
- [ ] Final audit re-score (target: all P0/P1 resolved)
- [ ] Lighthouse audit (target: 90+ performance, 100 accessibility)
- [ ] Sentry error tracking verified
- [ ] Vercel deployment with correct env vars
- [ ] Demo account seeded on new Supabase project
- [ ] Mobile testing on 3+ Android devices
- [ ] External USB scanner testing
- [ ] v1.0.0 tag and release

**Deliverable:** Production-ready launch.

---

## Sprint Dependencies

```
Sprint 5 (Scanner Core) ← START HERE
    ↓
Sprint 6 (Barcode in Forms) ← depends on Sprint 5
    ↓
Sprint 7 (Audit Fixes) ← can run in parallel with Sprint 6
    ↓
Sprint 8 (Offline/PWA) ← depends on Sprint 5
    ↓
Sprint 9 (E2E Tests) ← depends on Sprints 5-8
    ↓
Sprint 10 (Launch) ← depends on all above
```

## Estimated Timeline

| Sprint | Days | Cumulative |
|--------|------|------------|
| Sprint 5 | 3-4 | 3-4 |
| Sprint 6 | 2 | 5-6 |
| Sprint 7 | 2-3 | 7-9 |
| Sprint 8 | 2 | 9-11 |
| Sprint 9 | 2-3 | 11-14 |
| Sprint 10 | 2 | 13-16 |

**Total: ~2-2.5 weeks to launch**

## What We're NOT Building (per user request)

- No complex POS/checkout/cart system (just scan-to-stock-action)
- No fiscal invoicing
- No staff roles
- No multi-store
- No CSV import
- No offline sync beyond basic queue
- No Arabic as functional language yet
- No decorative charts
- No billing UI

## What We ARE Building

- Scanner as a **togglable mode** within existing InventoryPage
- Dashboard stays as home
- All existing features remain (products, carnet, reports, settings)
- Phone camera barcode scanning (html5-qrcode)
- External USB/Bluetooth scanner support
- Manual barcode input fallback
- Quick actions: scan → sell/receive with cart
- Progressive disclosure: simple by default, powerful when needed
- Offline-capable scanner
- PWA installable on Android
