<div align="center">

# Managiha

**Gérez votre épicerie simplement.** — A French-first web platform for Algerian mini-market owners to manage product stock and customer credit tabs (*carnet*). Single owner per store. DZD currency. Built with React + TypeScript + Supabase.

![React](https://img.shields.io/badge/React-18-58c4dc?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?logo=tailwindcss&logoColor=white&style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3-3fcf8e?logo=supabase&logoColor=white&style=flat-square)
![Tests](https://img.shields.io/badge/tests-58_passing-4caf50?style=flat-square)
![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>

---

## Why Managiha?

Algeria's retail is dominated by small owner-operated shops. Two pains break the classic notebook workflow:

1. **Stock visibility** — what's low, what's out, what it's worth.
2. **The carnet** — customers buy on credit, a notebook records "doit", reminders go through WhatsApp.

Managiha is a digital replacement for that notebook — not an accounting suite, not a POS, not GestiumPRO. Clean, calm, minimal, French-first.

> Managiha (مانجيهة, from *gérer*) — "to manage".

---

## Live demo

Try it without setting anything up:

- **App:** <https://managiha.vercel.app/>
- **Demo account:** `demo@managiha.app` / `Managiha2026`
- The demo store is seeded — 12 products (some low/out of stock, for the alerts to shine), movement history, 3 carnet customers with existing balances, suppliers.

> Sandbox by design: the credentials are public so anyone can explore. The password is documented here on purpose and the demo data can be wiped anytime (run `supabase/tests/rls_rpc_tests.sql`-style cleanup or just create your own account — signup is open).

---

## Features

- **Dashboard** — 4 KPIs (stock value, low stock, out of stock, carnet balance), low-stock list with a one-click "Réceptionner", recent activity feeds, and always-visible quick actions (add product / new carnet entry).
- **Products** — searchable/filterable catalog (category, status, supplier, archived), server-side pagination, quick-add modal, full product detail with movement history.
- **Stock (Inventaire)** — receive goods, adjust stock with a *required reason* (comptage / dommage / vol / correction), and a filterable movement history. Every mutation goes through a single atomic Postgres RPC.
- **Carnet** — customer list with balances, credit/payment entries (pick-or-create customer), customer detail with running balance, payment recording, and a **pre-filled WhatsApp reminder link** (wa.me — no API integration).
- **Suppliers** — contacts + WhatsApp links + linked products.
- **Reports** — low-stock, stock value, movement summary by date, carnet outstanding — all exportable as CSV (Excel-friendly, `;` + BOM).
- **Settings** — store profile, DZD fixed, French-only language selector structured for Arabic/RTL, read-only plan.

No POS, no invoicing, no staff roles, no multi-store, no billing. Deliberately minimal.

---

## Quick start

### 1. Clone & install

```bash
git clone https://github.com/Meykiio/managiha.git
cd managiha
npm install
```

### 2. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Project settings -> **API** — copy the URL and the `anon` key.
3. In the **SQL Editor**, open each file in `supabase/migrations/` **in order** and run them (or paste `supabase/all-in-one.sql` — the whole thing, idempotent).
4. **Authentication -> URL Configuration** — add `http://localhost:5173/reset-password` to the redirect allow-list.

### 3. Configure the env

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run test       # 58 unit/component tests
```

Sign up with any email + store name — the `stores` row is created automatically by a database trigger. Done.

---

## Architecture (why it's small but solid)

```
React 18 + TS + Vite + Tailwind   →  the app
        │ calls RPCs / REST
        ▼
Supabase Postgres (RLS)          →  data + security
Supabase Auth                    →  sessions (PKCE)
Supabase Storage                 →  product images (private bucket, per-store paths)
```

- **Multi-tenant by design** — every table carries `store_id`; RLS grants access only when `stores.owner_id = auth.uid()` (via the `is_store_owner()` helper). Separate SELECT/INSERT/UPDATE policies, no DELETE policies anywhere (soft-delete only: `archived_at`).
- **Atomic money & stock logic** — `products.current_stock` and `carnet_customers.balance` are only ever modified by two Postgres functions (`adjust_stock`, `record_carnet_transaction`) which lock the row, validate, update and log the movement in one transaction. The frontend never writes those columns — and **database triggers reject any direct client write to them**.
- **Signed quantities** — movements store `+10` / `-3`; the UI formats the sign.
- **Immutable history** — movements and carnet transactions have no UPDATE/DELETE policies.
- **RTL-ready** — logical CSS properties (`ps-*`, `me-*`, `start-*`…) + an i18n layer; Arabic only needs a dictionary + a `dir` flip.
- **No decorative charts** — tables and KPI cards only.

Docs with the full story (the behind-the-scenes of how this was built):

| Doc | What's in it |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product spec |
| [`docs/STATUS.md`](docs/STATUS.md) | Honest implementation audit vs PRD (with real gaps listed) |
| [`docs/PLAN.md`](docs/PLAN.md) | Research-based execution plan (verified with primary sources) |
| [`docs/`](docs/) research files | Market/research syntheses that shaped the product |

---

## Testing

```bash
npm test   # vitest + Testing Library (58 tests)
```

Tests cover the formatting helpers (DZD, signed amounts, `wa.me` phone normalization), CSV escaping, stock-status boundaries, i18n/RTL switching, form validation — and the contracts that matter: the carnet and stock-adjust flows are tested against a fake Supabase client, asserting the **correct RPC is called** and that **no direct writes to balance/stock ever occur**.

`supabase/tests/rls_rpc_tests.sql` is an integration suite (19 assertions) that runs against a real database — cross-store RLS isolation, RPC arithmetic, guard triggers, append-only history, soft-delete enforcement. It creates two throwaway `@managiha.test` owners and cleans up after itself.

---

## Before going live (self-hosting)

Supabase's built-in email sender is capped at **2 emails/hour** — for real users, turn on Confirm email + a custom SMTP in **Authentication** (or keep confirmation off), enable **Leaked Password Protection**, and schedule a periodic `supabase db dump` yourself (free tier has no automatic backups). That's it.

---

## Roadmap

- Product image uploads (storage infra ready, UI pending)
- History pagination (movements / transactions currently capped at newest 50/100)
- Category management (rename/archive)
- Arabic UI (structure ready)

---

## Contributing

Found a bug? Open an issue. Want to improve the French/UI or add a flow? Keep the rules:

- Files stay under ~250 lines.
- Soft-delete only; stock/balance writes must go through the RPCs.
- Every UI string goes through `src/i18n/`.
- `npm test` stays green; SQL suite passes before merging schema changes.

---

## Built as a demonstration

Managiha was built in an [AI-native workflow](https://github.com/Meykiio) — deep research first, a researched PRD, a build brief, then an agent-driven implementation with a full audit phase (PRD cross-check, security advisors, real integration tests that caught and fixed two real bugs). The `docs/` folder is the honest paper trail: research, spec, audit, plan — including the mistakes.

**Maintained by [Sifeddine Mebarki](https://github.com/Meykiio)** — web developer & AI-native builder from Algiers. MIT licensed, free to use, modify and learn from.
