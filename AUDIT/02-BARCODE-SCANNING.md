# Barcode Scanning Research

## Library Comparison (2025-2026)

### html5-qrcode (RECOMMENDED for Managiha)
- **Bundle:** ~230KB minified+gzipped
- **Formats:** 1D (EAN-13, UPC-A, Code 128, Code 39) + 2D (QR, DataMatrix, Aztec)
- **Maintenance:** In maintenance mode but still the most popular (118K npm/week)
- **Pros:** Complete solution with UI, handles iOS Safari quirks, barcode locator, works from camera + image files
- **Cons:** Unmaintained since April 2023, ZXing-based (also unmaintained)
- **Verdict:** Best for our use case — covers EAN-13 (Algerian products), has built-in UI, works on budget Android phones

### Quagga2
- **Bundle:** ~120KB
- **Formats:** 1D only (no QR)
- **Maintenance:** Actively maintained
- **Pros:** Written for browser scanning, barcode locator at any angle, reliable EAN/UPC
- **Cons:** 1D only, no QR support, occasional EAN misreads
- **Verdict:** Good fallback if we only need 1D barcodes

### @zxing/library
- **Bundle:** ~400KB
- **Formats:** All 1D + 2D
- **Maintenance:** Unmaintained
- **Pros:** Wide format support
- **Cons:** Large bundle, unmaintained, UPC-E issues
- **Verdict:** Too large, unmaintained

### Scandit MatrixScan Batch (Commercial)
- **Bundle:** WASM-based, requires COOP/COEP headers
- **Formats:** All 1D + 2D
- **License:** Paid (free tier available)
- **Pros:** Best accuracy, multi-barcode tracking, AR overlays, enterprise-grade
- **Cons:** Requires license key, COOP/COEP headers (breaks Vercel deployment), commercial
- **Verdict:** Overkill for our use case, but the skill is installed for reference

### jsQR
- **Bundle:** ~50KB
- **Formats:** QR only
- **Verdict:** Too limited

## Recommendation: html5-qrcode

**Why:** It's the only library that:
1. Supports both 1D (EAN-13, UPC-A, Code 128) and 2D (QR) in one bundle
2. Has built-in camera UI with preview
3. Handles iOS Safari camera quirks
4. Works from both camera and image files
5. Has a barcode locator (doesn't need perfect alignment)
6. Is the most popular (118K npm/week)

**Risk:** It's unmaintained. But for a PWA that needs barcode scanning, it's the most practical choice. The alternative (Scandit) requires COOP/COEP headers which may break Vercel deployment.

## Integration Strategy

### Approach: Scanner-First, Progressive Disclosure

The scanner is the primary input method. Everything else is secondary.

**Primary flow (scanner):**
1. User taps "Scanner" button (big, prominent)
2. Camera opens with barcode overlay
3. Scan product → auto-lookup in DB by barcode
4. Product found → show product card with qty input
5. Product not found → offer to create new product with barcode pre-filled
6. Confirm → stock updated, toast confirmation

**Secondary flow (manual):**
1. User can type barcode manually in search field
2. Same lookup logic as scan
3. Fallback for damaged barcodes or no camera

**Tertiary flow (browse):**
1. Full product list with search/filter
2. For when user doesn't have the barcode

### Barcode Data Model

Current `products` table has `barcode` field. We need:
- Index on `barcode` column for fast lookup
- RPC function `lookup_product_by_barcode(barcode_text)` that returns product + stock
- Support for barcode as primary identifier (not just SKU)

### Scan-to-Sale Flow

The simplest, most useful flow:
1. Scan product → see name, price, current stock
2. Enter quantity (or +/- buttons)
3. Confirm sale → calls `adjust_stock` with type='sale'
4. Running total shown at top
5. Repeat for next product
6. When done, show summary

This is what Algerian mini-market owners actually need — not a complex POS, but a quick scan-and-sell.

### Scan-to-Stock-Receive Flow

1. Scan product → see name, current stock
2. Enter quantity received
3. Confirm → calls `adjust_stock` with type='receive'
4. Repeat for next product

### Barcode Lookup API

We can use Open Food Facts for product auto-fill:
- API: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Returns: name, brand, image, nutrition data
- Free, no API key needed
- Covers many Algerian products (imported goods)

For local products not in OFF, we just create a new product with the barcode pre-filled.

## Algerian Market Considerations

- **Barcode format:** EAN-13 is standard for retail products in Algeria
- **Phone usage:** 95%+ Android, mostly budget phones (Samsung, Xiaomi, Huawei)
- **Camera quality:** Variable — need robust barcode detection that works with poor cameras
- **Connectivity:** Intermittent — scanner should work offline (barcode → local DB lookup)
- **Language:** Product names may be in French, Arabic, or both
- **External scanners:** Some shops use USB/Bluetooth barcode scanners — these act as keyboard input (Type 1 = HID)

## External Scanner Support

USB/Bluetooth barcode scanners work as keyboard HID devices. They type the barcode string followed by Enter. Our app should:
1. Listen for rapid keyboard input in any focused field
2. If input matches barcode pattern (digits, 8-13 chars) and ends quickly, treat as scan
3. Auto-submit the barcode lookup

This is already partially handled by the barcode input field, but we need to make it more robust for external scanners.
