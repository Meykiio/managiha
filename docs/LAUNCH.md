# Launch checklist

Everything below is either done, or explicitly listed as not done with a reason.
Nothing here is aspirational.

## Verified working

| Item | Evidence |
|---|---|
| 25 migrations apply to a live Supabase project | PostgreSQL 17.11, applied in order |
| SQL suites | 21 + 16 + 17 + 11 + 12 + 19 = **96 assertions**, all passing |
| Build and typecheck | `npm run gate` clean |
| Unit and component tests | 134 passing, 18 files |
| E2E + axe (WCAG 2.2 AA) | 20 passing, four routes × two themes × RTL |
| Dead code and unused deps | `npm run knip` clean |
| Content-Security-Policy | Verified against the built bundle: **0 violations**, app renders |
| Preview deployment | Live, headers confirmed, app boots |

The end-to-end suite is hermetic: `gate:e2e` builds with `--mode test` and the
placeholder credentials in `.env.test`, so it behaves identically with or without a
local `.env`. It previously did not — see the CI defect in `docs/PROJECT.md`.

## Deploy

The Vercel project `managiha` exists and is linked (`meykiio's projects`).

**Intended production environment variables:**

```
VITE_SUPABASE_URL               = https://oliiyrueztsmswtjlbhb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY   = sb_publishable_...
```

Both were previously pointing at a deleted Supabase project and were corrected.

### ⚠ The live deployment does not match this

The bundle served at `managiha.vercel.app` references a **different** project —
`cchmcvhafzewnfnnbojm` — not `oliiyrueztsmswtjlbhb`. So either the variables above
were set but the site was never rebuilt, or they were set on a different project.

Two consequences, both real:

1. The demo credentials in the README (`demo@managiha.app`) **do not work there**,
   because that account exists on `oliiyrueztsmswtjlbhb`.
2. It is unknown whether `cchmcvhafzewnfnnbojm` has migrations 00018–00024. If it
   does not, screens added since will fail at runtime rather than degrade.

Environment variables are baked in at build time, so setting them is not enough —
a redeploy is required. Then run `supabase/seed-demo.sql` against whichever
project it points at.

Deploy:

```bash
npx vercel deploy --prod
```

## Before launch — must do

1. **Confirm the Supabase hosting region against Loi 18-07.** Cross-border
   transfer needs an ANPDP authorisation or an adequate-protection finding. Not
   resolved and not resolvable from the code. See `docs/LEGAL.md`.
2. **Have the Arabic reviewed by a native speaker.** The interface terminology and
   the whole Arabic privacy policy are accurate translations written without a
   native reviewer.
3. **Have the English and Arabic privacy policies reviewed by someone qualified.**
   French is the reference text.
4. **Manual pass on a phone.** Sign up, add a product, receive stock, record a
   credit entry, take a sale, switch all three languages. Then repeat in
   aeroplane mode to see the queue behave.
5. **Set the Supabase redirect URLs** for the production domain — see the next
   section, or password reset links point at `localhost`.
6. **Decide on email confirmation.** It is **off** on the project this was built
   against, so signup completes immediately — see below.

## Supabase auth settings

Two settings matter, and both live in the Supabase dashboard rather than in code.

### Redirect URLs

**Authentication → URL Configuration.**

| Field | Value |
|---|---|
| **Site URL** | `https://your-domain.com` |
| **Redirect URLs** | `https://your-domain.com/reset-password` |

Also keep the development entry, or password reset stops working locally:

```
http://localhost:5173/reset-password
```

Why exactly this path: the app calls `resetPasswordForEmail` with
`redirectTo: ${window.location.origin}/reset-password` (see
`src/contexts/AuthContext.tsx`). Supabase validates that URL against the
allow-list before sending the email. If it is missing, **the email is never sent**
and the user sees the generic "if an account exists, we sent a link" message —
which is a deliberately vague response, so the failure is silent by design and
looks like a broken mail server.

The **Site URL** is the fallback target for any auth redirect that does not
specify one, including the signup confirmation link if confirmation is ever
enabled. It defaults to `http://localhost:3000`, which is why an unconfigured
project sends users to a dead page.

You can list a wildcard instead (`https://your-domain.com/**`) if you expect
preview deployments to need it, but the explicit path is tighter and sufficient.

### Email confirmation — deliberately off

**Authentication → Sign In / Providers → Email → "Confirm email".**

It is currently **off** on this project: every account is confirmed at creation
(`confirmation_sent_at` is null and `email_confirmed_at` equals `created_at`), so
signup logs the user straight in.

Turning it on means committing to **custom SMTP** at the same time. Supabase's
built-in sender is capped at **2 emails per hour project-wide**, so with
confirmation on, the third person to sign up that hour receives nothing and cannot
complete registration. Configure a provider (Resend, Postmark, Brevo) under
**Authentication → Emails** before enabling it.

## Before launch — should do

- **The barcode scanner under CSP.** Verified statically that nothing in our code
  violates the policy, but `html5-qrcode` builds DOM at runtime and was not
  exercised. It also needs a **secure context**, so it only works over HTTPS —
  which production has, and a LAN IP does not.
- **Lighthouse run** (`npm run lighthouse`) against the preview. The budget is
  configured; it has not been run against the deployed build.
- **Sentry.** `VITE_SENTRY_DSN` is empty, so the integration is inert. Either set
  it or remove the dependency.
- **Backups.** Supabase takes daily backups on paid plans; confirm the plan covers
  what you need. A shop's credit ledger is not reproducible.

## Explicitly not built, and why

| Not built | Reason |
|---|---|
| Full local-first reads | A data-layer rewrite, not a feature. `docs/OFFLINE.md` states the boundary. |
| Fiscal invoicing, card payments, fiscal receipts | Out of product scope: the 2027 inaltérabilité attestation is uncertifiable by us. |
| Staff roles, multi-store, billing UI | Out of scope. One owner per store is what makes the sync model simple. |
| CSV import | Out of scope. |
| Arabic as a *functional* language | **Done** — the opposite is true now; all three locales are complete. |
| Cookie consent banner | No advertising cookies, no third-party analytics, no profiling. A banner here would train people to dismiss the one that matters. |

## Rollback

Every deploy is immutable and addressable. To roll back:

```bash
npx vercel rollback
```

Database migrations are forward-only by design: they are additive and each one is
idempotent (`if not exists`, `create or replace`). Reverting schema is a manual
decision, not an automated one, and no migration in this repository drops a column
or table.
