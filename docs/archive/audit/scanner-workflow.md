# Sprint 5 Redesign: Scanner-to-Cash Workflow

## What Algerian Mini-Markets Actually Do (Research)

### The Daily Circuit (from Almawarid/CIRTASOFT)
```
Fournisseur → Réception → Étiquetage → Rayon → Caisse (scan + encaissement + ticket) → Stock décompté → Réassort → Inventaire
```

### Key Facts About Algerian Retail
1. **Caisse = scanner + panier + encaissement** — one continuous flow
2. **Cash is king** — "espèces ou carte" with automatic change calculation
3. **Credit (carnet) is essential** — neighborhood regulars buy on credit, pay later
4. **USB douchette 2D** is standard — acts as keyboard HID, no drivers needed
5. **Power cuts are common** — UPS mandatory, offline capability important
6. **Products without barcodes** — local bread, bulk items, artisanal products need internal QR codes
7. **Receipt printing** — 80mm thermal printer, not optional
8. **Manager checks from phone** — "le chiffre du jour se regarde depuis la maison"

### The Checkout Flow (from Almawarid POS)
```
1. Scan product → added to cart
2. Repeat for all items
3. Customer pays → "Payer" button
4. Espèces: show total, enter amount received, calculate change
5. Carte: just validate
6. Print ticket 80mm
7. Stock auto-deducted
```

---

## What Our Scanner Should Do

### Scanner Mode = Full Caisse (Not Just "Scan & Add")

The scanner tab is the **register**. It replaces the separate "Vendre" tab for most use cases.

### Complete Workflow

```
┌─────────────────────────────────────────────┐
│  Scanner                                    │
│  [📷 Caméra ON/OFF]  [🔍 Rechercher]       │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Camera viewfinder                  │    │
│  │  [scan frame overlay]               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ── Panier (3 articles · 425 DZD) ──────── │
│                                             │
│  Lait 1L UHT        ×2    200 DZD   [- +] │
│  Pain complet       ×1     50 DZD   [- +] │
│  Huile 1L           ×1    175 DZD   [- +] │
│                                             │
│  ─────────────────────────────────────────  │
│  TOTAL                          425 DZD    │
│                                             │
│  [💵 Vendre (Espèces)]  [📝 Crédit]        │
└─────────────────────────────────────────────┘
```

### The Two Payment Modes

#### 1. Espèces (Cash Sale)
```
Tap "Vendre (Espèces)"
→ Show total: 425 DZD
→ Input: "Montant reçu" (default = total)
→ If received > total: show "Monnaie à rendre: X DZD"
→ Confirm
→ adjust_stock called for each item (type: "sale")
→ Cart clears
→ Toast: "Vente enregistrée"
```

#### 2. Crédit (Carnet)
```
Tap "Crédit"
→ Show total: 425 DZD
→ Search/select customer (autocomplete)
→ If new customer: mini form (name, phone)
→ Confirm
→ adjust_stock called for each item (type: "sale")
→ record_carnet_transaction called (type: "credit", amount: 425)
→ Cart clears
→ Toast: "Crédit enregistré · Doit: 425 DZD"
```

### Edge Cases (All Handled)

#### At Scan Time
| Case | Handling |
|------|----------|
| Product not in DB | Show "Produit introuvable" + "Créer" button (pre-fill barcode) |
| Product archived | Show "Produit archivé" + "Restaurer" button |
| Same product scanned twice | Increment qty in cart (not duplicate) |
| Camera denied/unavailable | Manual barcode input field always visible |
| External USB scanner | Rapid keyboard input detection (8-13 chars <500ms) |
| Rapid-fire same barcode | 2s cooldown per barcode |

#### In Cart
| Case | Handling |
|------|----------|
| Qty = 0 | Remove from cart |
| Product archived since scan | Allow sale (stock still exists) |
| Product price changed | Use CURRENT DB price at checkout (not cached) |
| Switch tabs | Cart persists (in-memory within session) |
| Close page | Cart lost (acceptable for v1) |

#### At Checkout (Espèces)
| Case | Handling |
|------|----------|
| Empty cart | Button disabled |
| Stock insufficient | Block sale, show "Stock insuffisant pour X (reste: Y)" |
| Network error | Show error, cart preserved |
| Product archived mid-cart | Skip archived products, warn user |
| Multiple items | All-or-nothing transaction (if any fails, none sell) |

#### At Checkout (Crédit)
| Case | Handling |
|------|----------|
| Empty cart | Button disabled |
| No customer selected | Require customer selection |
| Stock insufficient | Block credit sale, same as espèces |
| Customer has existing debt | Show current balance: "Solde actuel: -X DZD" |
| New customer | Mini inline form (name required, phone optional) |

#### After Checkout
| Case | Handling |
|------|----------|
| Success | Cart clears, toast success, stock updated |
| Partial failure | Show which product failed, keep cart |
| Receipt needed | Future feature (Sprint 6+), not v1 |

---

## What Scanner Mode REPLACES

| Old Flow | New Flow |
|----------|----------|
| Inventory → Vendre tab → Search product → Enter qty → Submit | Scanner → Scan → Cart → Vendre → Done |
| Inventory → Réception tab → Search product → Enter qty → Submit | Keep Réception tab (separate flow for supplier deliveries) |
| Products → Search → View → Edit stock | Scanner for quick sales, Products page for catalog management |

## What Scanner Mode DOES NOT Replace

- **Réception tab** — receiving supplier deliveries is a different workflow (bulk, with supplier tracking)
- **Ajuster tab** — stock corrections are administrative, not point-of-sale
- **Historique tab** — viewing movement history
- **Carnet page** — managing customers, viewing balances, recording payments
- **Products page** — catalog management, editing products
- **Reports page** — analytics and exports

---

## Technical Design

### Data Flow
```
ScannerTab
├── useBarcodeScanner (camera + cooldown)
├── useScanCart (cart state)
├── BarcodeScanner (html5-qrcode camera)
├── ScanCart (cart UI with +/- controls)
├── PaymentModal (espèces/crédit selection)
│   ├── CashPayment (amount received, change calculation)
│   └── CreditPayment (customer search/select)
└── onConfirm:
    ├── For each cart item: callAdjustStock({ type: "sale", qty })
    ├── If credit: callRecordCarnetTransaction({ type: "credit", amount })
    └── Clear cart
```

### Components to Build/Modify
1. `src/components/scanner/PaymentModal.tsx` — payment mode selection
2. `src/components/scanner/CashPayment.tsx` — cash payment with change calc
3. `src/components/scanner/CreditPayment.tsx` — customer search + credit recording
4. `src/pages/inventory/ScannerTab.tsx` — update with payment flow
5. `src/hooks/useScanCart.ts` — update with price-at-checkout logic

### Stock Validation
- Before calling adjust_stock, check `current_stock >= quantity` for each item
- If any item fails validation, block entire sale with specific error
- Use the `products_overview` view for stock status check

### Price Handling
- Cart stores `product` object (with current price at scan time)
- At checkout, re-fetch prices from DB to handle concurrent price changes
- If price changed, show warning: "Prix modifié: ancien → nouveau"

---

## Implementation Plan

### Phase 1: Payment Flow (This Sprint)
- [ ] Create PaymentModal with Espèces/Crédit tabs
- [ ] Create CashPayment (amount input, change calculation)
- [ ] Create CreditPayment (customer search, mini form)
- [ ] Update ScannerTab to use PaymentModal
- [ ] Add stock validation before checkout
- [ ] Add price re-fetch at checkout
- [ ] Update i18n strings

### Phase 2: Polish (Next Sprint)
- [ ] Receipt display on screen (80mm format preview)
- [ ] Cash session tracking (ouverture/fermeture de caisse)
- [ ] Daily totals on dashboard
- [ ] Sound/vibration on scan
- [ ] Offline cart persistence (sessionStorage)

### Phase 3: Future
- [ ] Thermal printer integration
- [ ] TPE/card payment
- [ ] Barcode label printing
- [ ] Multi-cashier sessions
