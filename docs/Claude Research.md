# Research Findings — Mini Market Stock & Product Management Platform (Algeria)

Synthesized from live web research against the Deep Research Brief. Findings only — PRD and build prompt come after the carnet-vs-inventory fork is decided (see verdict at bottom).

---

## 1. Market

- Algerian retail is highly fragmented and dominated by small private/informal shops. Modern retail (supermarkets/chains) accounts for only ~3% of grocery turnover — the mini market is the default format, not a niche.
- A direct local competitor already exists: **CIRTASOFT (GestiumPRO / GestiumERP / GestiumPOS)**, explicitly positioned for Algerian mini markets and supermarkets. Their own marketing frames a mini market as needing thousands of product references, multiple simultaneous checkouts, expiry-date tracking, and ~50 suppliers to track — treat this as a vendor sales pitch, not a verified baseline for a *typical* mini market.
- GestiumPRO pricing is **quote-only**, tiered by business size (auto-entrepreneur / commerçant-PME / grande entreprise). No public DZD figure found anywhere. This is a B2B sales-call motion, not self-serve SaaS.
- No public evidence of a self-serve, low-cost, single-store inventory SaaS built specifically for Algeria. The gap looks real, at least in visibility/positioning.

**Implication:** Self-serve pricing and a lightweight single-store product are already a differentiator on go-to-market alone, separate from any feature difference.

---

## 2. The "Carnet" (credit tab) angle — validated, not hypothetical

- Standalone apps already exist and are used in this exact market for tracking customer debt/credit tabs: **Karnet** ("le carnet de crédits des commerçants") and **Carnet de Dettes & Clients** (App Store).
- Both are explicitly **offline-first** ("100% hors ligne," data never leaves the device) and **WhatsApp-native** for sending statements/reminders.
- This is independent validation that debt/tab tracking is a real, acute pain point for Algerian shopkeepers — solved today by single-purpose micro-apps, not by inventory tools.

**Implication:** This is the strongest signal in the whole research set. It suggests the "real" pain point may not be pure inventory at all, or may be inventory *plus* carnet — not inventory alone. See verdict below.

---

## 3. Payments — no recurring billing rail exists

- Algeria has no automated recurring-billing infrastructure for consumer/SMB SaaS.
- Card rails exist (CIB, Dahabia, via SATIM) but the standard real-world flow for collecting payment from a merchant is: share a CCP account number or BaridiMob QR code → buyer manually transfers → seller manually confirms before unlocking service.
- BaridiMob (Algérie Poste's mobile wallet) has 16M+ accounts and is the dominant peer-to-peer transfer method, but it is a **manual push-transfer model**, not a subscription/auto-charge model.

**Implication:** Do not build a self-serve billing/checkout page for v1. A "Settings → Plan" page with automated card charging would be over-building for infrastructure that doesn't exist in this market. Manual onboarding (owner pays via BaridiMob/CCP transfer, you confirm and activate the account) is the honest MVP.

---

## 4. Connectivity — not the constraint the original brief assumed

- Algeria in 2026: ~37.8M internet users, 79.5% internet penetration; ~36M mobile internet users, 77% mobile internet penetration.
- Mobile internet download speeds rank respectably internationally (76th globally, ~53 Mbit/s).
- This is a well-connected market, not a rural/first-generation-connectivity problem.

**Implication:** Standard Supabase realtime + normal loading/optimistic-UI states are defensible for v1. No need to invest in true offline-first sync architecture the way the carnet apps did — their offline-first design is more likely a trust/privacy positioning choice ("your data never leaves your phone") than a connectivity necessity.

---

## 5. Data protection law — citation could not be verified, flagging as an error

- The original brief referenced "Loi n° 25-11" as Algeria's data protection law. I could not verify this citation.
- The Algerian data protection law I *can* confirm exists is **Loi n° 18-07**, referenced directly in an ANPDP (Algerian data protection authority) notice found during research.
- Recommend verifying the correct law number directly (e.g., via ANPDP's own site) before any compliance language goes into a PRD, privacy policy, or marketing material — don't let an unverified law number get treated as fact.

---

## 6. Architecture & Data Model

Nothing found in research contradicts the default technical approach:
- Single Supabase project, RLS-per-store row isolation keyed to `auth.uid()` or `store_id`.
- Postgres trigger/function for atomic stock decrement on sale — never trust client-side math for stock quantity.
- Soft-delete/archive pattern on products, given how easy accidental bulk-delete is for a low-digital-literacy single owner.
- No unusual requirement surfaced for multi-currency (DZD-only is safe to assume) or realtime multi-session sync (single-owner use case, low priority).

---

## Verdict: the brief hides a fork that needs deciding before a PRD gets written

The original brief kept Section 1 explicitly open — "is inventory even the real pain point, or is it something else (carnet, supplier ordering, shrinkage)?" The research answers that question with real evidence, not speculation: **there's a validated, currently-underserved-by-inventory-tools pain point (carnet/credit tab tracking) sitting right next to the inventory problem**, and it's *not* the same product as what CIRTASOFT sells.

Two different products are hiding in one brief:

1. **Pure stock/product catalog tool** (as originally scoped) — lighter version of what GestiumPRO already sells, minus multi-till/multi-supplier depth.
2. **Inventory + carnet combined** — no direct competitor found doing both together; arguably the more differentiated wedge given evidence in Section 2.

**Concrete next action:** Decide which of these two you're building before writing the PRD or the Lovable build prompt — it changes the sitemap, the schema, and the pitch. If you're not sure, that's a signal this brief is desk research standing in for a conversation you haven't had yet with actual mini market owners (Hanut owners) — worth talking to 3–5 before locking scope.
