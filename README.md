# Managiha

**Stock and customer credit for the Algerian corner shop.**

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![CI](https://github.com/Meykiio/managiha/actions/workflows/ci.yml/badge.svg)](https://github.com/Meykiio/managiha/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Managiha replaces the notebook behind the counter. Know what is on the shelf, what
it is worth, what is about to expire, who still owes you money, and what you
actually earned this month — in French, English or Arabic.

Built for a shop owner standing up, holding a phone, with a customer waiting.

> **العربية**: [اقرأ هذا الملف بالعربية](README.ar.md)

---

## Why Managiha

Algeria's retail is overwhelmingly small, owner-operated shops. Two things break
the paper workflow, and both break it quietly:

1. **Stock.** What is low, what has run out, what is about to expire, and what the
   shelf is actually worth. The notebook says "5 sacs de farine" and was last
   updated eight days ago.
2. **The carnet.** Customers buy on credit and pay later. The notebook records
   "doit 3 500" with no date, no running total, and no way to answer "how much
   does Ahmed owe?" without reading every page.

Existing tools are either built for accountants, locked behind a subscription, or
aimed at supermarkets. Managiha is the size of the job: a shop, one owner, a
phone.

**Managiha** (مانجيهة, from *gérer*) — "to manage".

## What it does

- **Sell at the counter** — full-screen cart, scan a barcode *or* type a name,
  cash or credit, change calculated, receipt shown only once the server confirms.
  Products with no barcode can be created mid-sale without leaving the cart.
- **Know your stock** — receiving with expiry dates and lot codes, adjustments with
  a required reason (count, damage, theft, return, correction), and a **shelf count
  session** that walks the shop rather than opening forty dialogs.
- **Catch expiry before it costs you** — lots are tracked in FEFO order (first
  expired, first out), the dashboard shows what is about to go off and what it is
  worth, and any lot can be written off in one action.
- **Run the carnet** — balances per customer, credit and payment entries, a running
  history, and a **pre-filled WhatsApp reminder** that opens in the shopkeeper's own
  WhatsApp. No API, no business verification, no account.
- **Know what you earn** — revenue, units and estimated margin over 7, 30 or 90
  days, best sellers, dead stock, and a **reorder list grouped by supplier** that
  can be sent as a WhatsApp order.
- **See margin while you set prices**, with a warning before you sell below cost.
- Every report exports to CSV in a shape Excel opens directly.

Arabic is fully right-to-left. Dark and light themes. Currency is fixed to DZD.

### What Managiha is not

Managiha is a **back-office tool, not a point of sale**. It records what you sold
so you know what you have and what you earned. It does **not** produce fiscal
invoices (Décret Exécutif 05-468), process card payments, print fiscal tickets, or
close a till.

This is deliberate. From **1 January 2027**, Algerian businesses using "un logiciel
de gestion ou un système de caisse" must hold an attestation certifying
inaltérabilité, sécurité, conservation and archivage of their data. That obligation
falls on the shop owner. Staying out of the till category means you never inherit
an obligation this software cannot certify — and you can run Managiha alongside
whatever fiscal system you already use.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite, Tailwind CSS, react-router-dom |
| UI | A small in-house kit (`components/ui/`) on design tokens — no component library |
| Data | Supabase: Postgres + Auth (PKCE) + Storage, with row-level security |
| Security | RLS on all 11 tables, `SECURITY DEFINER` write RPCs, guard triggers, idempotency keys |
| i18n | French / English / Arabic, RTL, type-enforced key completeness |
| Offline | Durable IndexedDB write queue for stock and carnet writes (not sales) |
| Icons | lucide-react |
| Tests | Vitest + Testing Library, Playwright + axe, six SQL suites |
| Errors | Sentry (optional — off unless a DSN is set) |

Runtime dependencies: React, react-router, Supabase, lucide-react, clsx,
html5-qrcode, Sentry. That is the whole list, and it is short on purpose — this
runs on a cheap Android phone on a bad connection.

## Getting started

### Prerequisites

| Tool | Why |
|---|---|
| **Git** | to clone the repository |
| **Node.js 20+** | to build and run the app |
| **npm** | comes with Node |
| **A Supabase project** | free tier is enough — [supabase.com](https://supabase.com) |

No Docker. Managiha targets a hosted Supabase project, and the SQL suites run
against it directly.

### Quick start

```bash
# 1. Clone
git clone https://github.com/Meykiio/managiha.git
cd managiha

# 2. Install
npm install

# 3. Environment
#    macOS / Linux / Git Bash:
cp .env.example .env
#    Windows PowerShell:
#    Copy-Item .env.example .env
#    Then paste your Project URL and publishable key into .env

# 4. Create the database, ONCE
#    Supabase dashboard -> SQL Editor -> New query
#    Paste the FULL contents of supabase/all-in-one.sql and Run.

# 5. Run
npm run dev
# open http://localhost:5173
```

Then **sign up with any email and a store name** — the `stores` and `profiles`
rows are created by a database trigger, so there is no setup step.

Before you sign up, turn **off** *Confirm email* in
**Authentication → Sign In / Providers → Email**. A fresh Supabase project has it
on, which blocks signup until the link is clicked, and the built-in sender is
capped at 2 emails/hour — which you will exhaust during your own testing. Full
detail, including what to do for real users, is in [docs/DEPLOY.md](docs/DEPLOY.md).

> `supabase/all-in-one.sql` is generated from `supabase/migrations/` by
> `npm run db:bundle`, and is identical to `supabase/master-schema.sql`. It is
> **not idempotent** — run it on a fresh database.

### One-click setup (no technical knowledge needed)

Copy the prompt below into any AI coding assistant — Claude Code, Cursor,
opencode, Codex, Gemini CLI, Windsurf — and let it do everything. It detects your
operating system, installs what is missing, creates the environment file, and gets
you to a working Managiha with a logged-in account.

### One-click setup prompt — paste this into your AI assistant

```
You are setting up Managiha, an open-source stock and customer-credit app for
small shops (React + TypeScript + Vite + Supabase). The user is not a developer.
Work autonomously, verify every step, and explain each step in one plain sentence.
Never skip a failed verification: diagnose the root cause, fix it, and re-run
before continuing. Report honestly if something cannot be done rather than
improvising.

GOAL: Managiha running at http://localhost:5173, connected to a Supabase project
that has the schema applied, with a first account that can log in and reach the
dashboard.

IMPORTANT CONTEXT
- Managiha has NO server of its own. The browser talks to Supabase directly. So
  the only two things to set up are Node and a Supabase project.
- Docker is NOT needed and must NOT be used. There is no local Supabase stack.
- Supabase's built-in email sender allows only 2 emails per hour, so email
  confirmation must be OFF during setup.

FIRST, ASK ONE QUESTION before installing anything:
"Do you already have a Supabase project, or should I walk you through creating a
free one?" Then follow the path they chose. Wait for the answer.

STEPS:

0. DETECT THE PLATFORM FIRST. Determine the OS (Windows, macOS, Linux), the CPU
   architecture, and — on Windows — whether you are in PowerShell, cmd, or Git
   Bash, and use the right syntax for each. Report which OS you detected.

1. VERIFY PREREQUISITES. Check each; install any that are missing using the
   OS-appropriate method. Report exactly what you installed, and whether a restart
   is needed.
   - Git: `git --version`
     Windows: winget install Git.Git
     macOS:   brew install git   (or use the built-in)
     Linux:   apt install git    (or dnf install git)
   - Node.js 20+: `node -v`
     Windows: winget install OpenJS.NodeJS.LTS
     macOS:   brew install node
     Linux:   apt install nodejs npm   (or use nvm)
   - npm: `npm -v`   (comes with Node)
   If the installed Node is older than 20, upgrade it before continuing — the
   build will fail on syntax the bundler emits otherwise.

2. CLONE. If the current folder is not already the project:
   git clone https://github.com/Meykiio/managiha.git
   cd managiha

3. INSTALL DEPENDENCIES. Run `npm install`. Report honestly if it fails and fix
   the root cause.

--- SUPABASE SETUP ---

4. GET THE PROJECT. If they have one, ask them to open it and go to
   Project Settings -> API. You need two values:
     - Project URL          (https://<ref>.supabase.co)
     - the publishable / anon key
   Explain clearly: the publishable key is public and safe to put in the app. The
   service_role key is NOT — it bypasses all security — and must never be used
   here or pasted anywhere in this project. If they cannot find the values, walk
   them to the right dashboard page.
   If they have no project: have them create one at supabase.com on the free plan
   (choose a region close to them), then return to the API page.

5. TURN OFF EMAIL CONFIRMATION. Tell the user to go to
   Authentication -> Sign In / Providers -> Email and turn OFF "Confirm email",
   then Save. A fresh project has it ON, which blocks sign-up entirely and burns
   the small free email quota. This step is required, not optional.

6. APPLY THE SCHEMA, ONCE. Dashboard -> SQL Editor -> New query. Read
   `supabase/all-in-one.sql` and paste its FULL contents, then Run. It creates all
   tables, the row-level security policies, the write functions, the guard
   triggers, and the storage bucket. Run it exactly ONCE, on a fresh project.
   Verify the run:
     select count(*) from public.products;    -- must return 0
   If it errors, read the message: the most common cause is running it twice.

7. CREATE `.env` in the project root (never commit it):
     VITE_SUPABASE_URL=<the Project URL>
     VITE_SUPABASE_PUBLISHABLE_KEY=<the publishable key>
     VITE_SENTRY_DSN=
   Match .env.example exactly. Do not invent extra variables.

--- FINISH ---

8. RUN THE APP. Start `npm run dev` in the background. Confirm
   http://localhost:5173 loads with no console errors.
   If port 5173 is busy, say so and use another port rather than silently failing.

9. TYPE-CHECK. Run `npm run typecheck`. Report the result honestly. (Use the npm
   script, not a bare `tsc --noEmit` — the root tsconfig is a solution-style
   config with project references, so a bare invocation type-checks zero files
   and always exits 0.)

10. CREATE THE FIRST ACCOUNT in the app: any email, any store name. Confirm it
    reaches the dashboard. If it does not, the usual causes are, in order: email
    confirmation still on (step 5), the schema not applied (step 6), or wrong
    values in .env (step 7). Diagnose, do not guess.

11. OPTIONAL DEMO DATA. If the user wants a populated store instead of an empty
    one, tell them to sign up once with the address `demo@managiha.app`, then run
    `supabase/seed-demo.sql` in the SQL Editor. It builds twelve products, three
    suppliers, three customers with balances, a sales history, and a few low or
    empty shelves.

12. FINAL REPORT. Print a clear summary:
    - What is running and where (the app URL; the Supabase dashboard URL)
    - The daily commands: `npm run dev` to start, Ctrl+C to stop
    - How to run the checks: `npm run gate` (lint, typecheck, 134 tests, build)
      and `npm run gate:all` (adds the browser end-to-end suite and knip)
    - What is deliberately NOT enabled and why: fiscal invoicing and cash-drawer
      features are out of scope by design; Sentry is off because no DSN is set
    - Any unresolved issue, with its exact error message

HARD RULES
- Never commit secrets, and never write the service_role key into .env or any
  file in this repository.
- Do not add, remove, or upgrade dependencies. Use what is in package.json.
- Do not modify anything under supabase/ except by running the existing files.
- Docker is neither needed nor wanted.
- If a step cannot be completed, stop and explain exactly what is missing. Do not
  improvise a workaround that pretends to have worked.
```

### A demo store

`supabase/seed-demo.sql` builds a populated store on a `demo@managiha.app`
account: twelve products across five categories, three suppliers, three customers
with balances, a real sales history recorded through the same functions the app
uses, and four products deliberately left low or empty so the alerts have
something to show.

Sign up once with that address in the app, then run the file in the SQL Editor. It
is safe to re-run — it wipes only that account's own rows first.

A hosted instance runs at **<https://managiha.vercel.app/>**. Its demo login is
`demo@managiha.app` / `Managiha2026` **once that deployment's Supabase project has
been seeded** — run `seed-demo.sql` in the SQL Editor of whichever project the
deployment's environment variables point at. If the credentials are rejected,
that is the reason, not a bug.

> Any published demo credentials are public by definition. Treat that account as a
> sandbox and never put real shop data in it.

## Deploying

Managiha is a static build with no server, so deploying is: host the files, and
point the app at your project.

```bash
npm run build      # typecheck + vite build -> dist/
```

`vercel.json` is included with the SPA rewrites, a Content Security Policy, and
the cache headers. Full instructions — including the Supabase redirect URLs that
everyone forgets, custom SMTP, leaked-password protection, and backups — are in
**[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Documentation

| Document | Contents |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | What every screen does, and why |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema, RLS, the write RPCs, and the traps |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Where code lives and where new code goes |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Supabase, environment, hosting, go-live checklist |
| [docs/PROJECT.md](docs/PROJECT.md) | Current state, known issues, and the honest gaps |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Tokens, type scale, component rules |
| [docs/OFFLINE.md](docs/OFFLINE.md) | What works offline, and what deliberately does not |
| [docs/LEGAL.md](docs/LEGAL.md) | Loi 18-07 position, data rights, and what is unresolved |
| [docs/TOOLING.md](docs/TOOLING.md) | Which tools are used and which were declined, with reasons |
| [docs/archive/](docs/archive/) | The research, the original spec, and the audit trail |

## Verification

The full gate, in order:

```bash
npm run gate        # eslint + tsc + 134 tests + production build
npm run gate:all    # the above + 20 Playwright/axe specs + knip
```

`gate:all` is what to run before opening a pull request.

The browser suite asserts **zero axe violations on every public route, in both
themes, and in RTL** — a theme or locale bug that a unit test cannot see. The full
suite is green: 134 unit and component tests across 18 files, 20 end-to-end specs,
a clean production build, and knip reporting no unused files or exports.

### The SQL suites

Six suites in `supabase/tests/`, **96 assertions**, all self-cleaning. They run
against a real PostgreSQL (17.11 when last verified) in the SQL Editor:

| Suite | Assertions | Proves |
|---|---|---|
| `rls_rpc_tests.sql` | 21 | Cross-store isolation, guard triggers, append-only history |
| `checkout_rpc_tests.sql` | 16 | Checkout, FEFO allocation, idempotency |
| `product_lots_tests.sql` | 17 | Lot arithmetic and the lot-sum invariant |
| `trends_rpc_tests.sql` | 11 | Dashboard aggregation |
| `legal_rpc_tests.sql` | 12 | Data export and anonymisation |
| `insights_rpc_tests.sql` | 19 | Sales, margin, dead stock, reorder |

They are manual because Docker was declined. They are also the thing that found
defects four rounds of code review had missed — including a sale recorded from the
inventory screen that stored no price, and therefore earned nothing. Treat them as
a real gate, not a formality.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first — it
explains the constraints that keep this project coherent, and its out-of-scope
list, which is enforced on principle rather than on effort.

The short version: stock and balances change only through the database functions,
files stay under 250 lines, every string goes through the translation layer, and
`npm run gate:all` must pass.

## Security

See [SECURITY.md](SECURITY.md) to report a vulnerability privately. The security
model — row-level security on every table, server-side pricing, guard triggers,
idempotent writes — is described there and in
[docs/DATABASE.md](docs/DATABASE.md).

## License

[GNU GPL v3.0 or later](LICENSE) — Managiha is free software and stays free.
Anyone may use it commercially, study it, and change it, but any copy or derivative
they distribute must keep the same freedoms: the complete source code, under the
GPL (this version or any later version).

**© 2026 Sifeddine Mebarki** — built in Algiers, for the shop on the corner.
