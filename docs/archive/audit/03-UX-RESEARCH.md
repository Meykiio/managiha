# UX Research: Scanner Integration & Flutter Billing App Analysis

## Flutter Billing App (Reference)

**Repo:** `Dinesh-Sowndar/flutter_billing_app` — Flutter POS with barcode scanning, cart, thermal printing, offline-first Hive DB, BLoC architecture.

### Architecture
- **BLoC pattern**: `BillingBloc` manages scan events, cart state, print flow
- **Cart model**: `CartItem` with product, quantity, computed total
- **Offline-first**: Hive local DB, products cached locally
- **Printer integration**: Bluetooth thermal printer via `PrinterHelper`

### Key UX Patterns Observed

#### 1. Split-Screen Scanner Layout
- **Top 40%**: Camera view with barcode detection
- **Bottom 60%**: Cart panel with overlap (rounded corners, drag handle)
- Cart panel has: header (item count + total), item list, checkout button
- Camera off state shows a friendly message with "Turn on Camera" CTA

#### 2. Scanner-as-Home (Not a Separate Page)
- The home page IS the scanner — no separate scanner route
- Product list page has a scanner icon button next to search field
- ScannerPage exists as a standalone scanner with barcode return (for product lookup)
- Two scanner modes:
  - **Full scanner** (home): camera + cart + checkout
  - **Scan-to-lookup** (product list): camera → return barcode → search

#### 3. Cooldown Logic
- 2-second cooldown per identical barcode to prevent rapid-fire duplicates
- Vibration feedback on successful scan
- One barcode processed per frame (break after first match)

#### 4. Cart Management
- Quantity +/- inline controls on each cart item
- Swipe or button to remove items
- Running total displayed prominently
- Empty state with icon + helpful message

#### 5. Checkout Flow
- Cart review table (product, price, total columns)
- Grand total at bottom
- Print receipt button (disabled when empty)
- UPI QR code for payment (we won't need this)

#### 6. Camera Controls
- Flash toggle (torch on/off)
- Camera on/off toggle (keeps cart visible, shows friendly off state)
- Settings button (accessible from scanner view)

### What We Can Adapt for Managiha

| Flutter Pattern | Managiha Adaptation |
|-----------------|---------------------|
| Scanner as home | Scanner as **mode toggle** within InventoryPage (user's request) |
| Split-screen camera+cart | ScannerMode component: camera top, cart bottom |
| Cart with quantity controls | ScanCart component with +/- and running total |
| Cooldown logic | 2s cooldown per barcode in useBarcode hook |
| Camera on/off | Toggle in ScannerMode header |
| Checkout → Print | Review → Confirm stock action (Vendre/Réceptionner) |
| Product lookup by barcode | RPC `lookup_product_by_barcode` + Open Food Facts fallback |

---

## Progressive Disclosure (Nielsen Norman Group, 2025)

**Core principle:** Show only what the user needs right now. Make the rest available on demand.

**Three patterns:**
1. **Feature gating by action** — reveal features after prerequisite tasks
2. **Reveal on scroll** — load info progressively as user scrolls
3. **Contextual hints** — tooltips/coachmarks at moment of first use

**Key rules:**
- Every screen answers ONE question the user is asking right now
- Make the next question answerable from that screen
- Don't hide features permanently — surface them when user behavior signals readiness
- Max 2 disclosure levels on mobile (desktop can do 3)

---

## Managiha Scanner Integration UX

### User's Corrected Direction (Sep 2026)
> "Dashboard stays. Scanner is a feature that can be toggled on/off. All existing features remain."

**What stays:**
- Dashboard as home page
- Products page with full table
- InventoryPage with 4 tabs (receive/sell/adjust/history)
- CarnetPage (customer credit)
- ReportsPage
- SettingsPage

**What gets added:**
- Scanner mode toggle in InventoryPage (new tab or toggle button)
- Scan-to-cart flow for quick sell/receive actions
- Barcode field in ProductFormFields
- Barcode lookup RPC

### Scanner Mode UX Flow

```
InventoryPage
├── [Scanner] [Réception] [Vendre] [Ajuster] [Historique]
│
├── Scanner tab (active):
│   ┌─────────────────────────────┐
│   │  📷 Scanner   [ON/OFF]     │
│   │  ┌───────────────────────┐  │
│   │  │   Camera viewfinder   │  │
│   │  │   [scan frame overlay]│  │
│   │  └───────────────────────┘  │
│   │                             │
│   │  🔍 Code-barres: [_____]   │
│   │                             │
│   │  ── Panier (3 articles) ── │
│   │  Product A   x2  200 DZD  │
│   │  Product B   x1  150 DZD  │
│   │  Product C   x3   75 DZD  │
│   │                             │
│   │  Total: 425 DZD            │
│   │                             │
│   │  [Vendre] [Réceptionner]   │
│   └─────────────────────────────┘
│
├── Réception tab (existing form)
├── Vendre tab (existing form)
├── Ajuster tab (existing form)
└── Historique tab (existing list)
```

### Key UX Decisions

1. **Scanner is a tab, not a replacement** — user can switch between scanner and traditional forms
2. **Cart persists across tab switches** — scan items, switch to Vendre tab, cart is there
3. **Manual input fallback** — barcode text field for external scanners or unreadable codes
4. **Product not found** — offer to create new product with barcode pre-filled
5. **Quick actions after scan** — Vendre/Réceptionner buttons in cart panel
6. **Camera toggle** — can turn off camera and use manual input only

---

## External Scanner (USB/Bluetooth) UX

These scanners act as keyboard HID. The UX should be:
1. Any page can receive barcode input
2. Rapid digit input (8-13 chars in <500ms) = scan detected
3. Auto-lookup product by barcode
4. If found: add to scan cart, auto-focus quantity
5. If not found: show "Produit non trouvé" with "Créer" button
6. Sound feedback on successful scan

This means the barcode input field should be always available in scanner mode, not just as a fallback.

---

## Mobile-First Design Rules for Algeria

1. **44px minimum touch targets** (already done)
2. **One hand operation** — all primary actions reachable with thumb
3. **Large text** — minimum 16px body text (prevents iOS zoom)
4. **Offline first** — scanner + product lookup must work without internet
5. **Fast load** — budget phones, slow 3G. Target <3s First Contentful Paint
6. **Simple navigation** — tabs, not nested routes
7. **Big CTAs** — "Scanner" button should be prominent in scanner mode
