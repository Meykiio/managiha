# Managiha — Master Plan v2 (research-based)

**Written:** 23 Aug 2026. Every decision below rests on verified research (primary sources cited inline); areas still requiring legal/professional confirmation are explicitly flagged, not glossed.

---

## Research findings that shaped this plan

| # | Topic | Finding (evidence) | Consequence |
|---|---|---|---|
| R1 | Algeria data-protection law | **Loi n° 25-11 du 24 juillet 2025** (JO n° 48) amends/completes **Loi 18-07 du 10 juin 2018**. Full official text published by ARPCE (arpce.dz). ANPDP communiqué (Radio Algérie / El Mawkie, 3 Aug 2025) explicitly includes "*personnes physiques exerçant une activité professionnelle ou commerciale*" in scope; articles 41 bis (DPO), 41 bis 2/3 (registre des activités de traitement, carnet automatisé), 43 (registre des violations) create real obligations for controllers — i.e. the store owners processing carnet PII. | PRIVACY.md cites the right texts; DPO/registre obligations flagged for Algerian counsel (PRD §8.11). Data minimization already implemented (name/phone/notes only) is the correct posture. |
| R2 | Supabase built-in email | Hard cap **2 emails/hour project-wide**; docs state *"Custom SMTP Only"* to change. Best-effort deliverability from a shared Supabase domain. (supabase.com/docs/guides/auth/rate-limits, /guides/auth/general-configuration) | **Production blocker**: signup confirmations + password resets break past 2 users/hour. Plan: custom SMTP (Resend/Postmark/SendGrid, verified domain) before any real launch. For dev, "Confirm email" off is fine. |
| R3 | Auth rate limits | Dashboard **Authentication → Rate Limits** + Management API `PATCH /projects/{ref}/config/auth`. Defaults (July 2026): signup/sign-in **30 per 5 min per IP**; OTP 30/hr; verification 360/hr; token refresh 1800/hr; per-user 60s windows; anti-enumeration via `resetPasswordForEmail` (no account existence leak). **Open bug supabase/auth#41947**: the Dashboard "sign-ups/sign-ins" limit is *not enforced as configured* (observed ~30–50 before 429) — fixes in progress. | Set explicit limits in the Dashboard (cheap, config-only) AND add **Turnstile CAPTCHA** to signup/reset — the only solid protection while #41947 is open. Document both in README. |
| R4 | Backups | **Free plan = no automated backups** ("We recommend that free tier plan projects regularly export their data using the CLI `db dump` and maintain off-site backups"). Pro: 7-day daily backups (DB only — Storage files excluded). PITR add-on ≈ $100/mo per 7-day window. Backup files themselves aren't downloadable on physical backup projects. | RUNBOOK.md: nightly GitHub-Actions workflow → `supabase db dump` (schema/data/roles) + Storage sync via S3 endpoint → off-site bucket; **restore drill at least once** ("a dump nobody has replayed is a file, not a backup"). Watch egress cost (free: 5 GB/mo then fair-use). |
| R5 | Storage images | Private bucket + signed URLs = correct pattern for product images; **image transformations are Pro-plan gated** (docs; one measurement saw Free render but docs explicitly say Pro+ — do not build on it). First hardening gate = **bucket size/MIME restrictions** (docs: RLS doesn't check size/MIME). Recommended defense-in-depth: bucket limits + client-side type/size validation + sanitized path `{storeId}/{productId}/{uuid}-{safeName}` (research: `foldername[1]` RLS backstop + no path traversal). Signed URLs: keep expiry short, note cache-hit tradeoff. | Bucket hardening migration (00007): `fileSizeLimit: 20MB` (25MB platform max) + `allowedMimeTypes: [png, jpeg, webp]`. Image UI builds on signed URLs only, no transforms in v1. |

---

## Phase 0 — Environment (blocker)

- [ ] [you] Restart the opencode session so the remote Supabase MCP rebinds to `wkgrczxflbptcyjzisxs` (config already correct; this session still resolves to the wrong project).
- [ ] [me] Verify binding → diagnostic snapshot: 9 tables, 22 RLS policies, 2 guard triggers, 3 RPCs, bucket `product-images` (+ its 4 policies), then `supabase_get_advisors` for the platform's own security/performance advisories.

## Phase 1 — Apply pending migrations

- [x] [me] `00005` grants + schema reload; `00006` guard triggers (split/fixed via 00008 — the shared-trigger version was broken and CAUGHT by the suite) (RPC-only writes enforced at DB level).
- [x] [me] **New `00007`** (from R5): bucket harden — `update storage.buckets set file_size_limit=20971520, allowed_mime_types='{"image/png","image/jpeg","image/webp"}' where id='product-images'`.
- [x] [me] All mutations integrated into the idempotent `supabase/all-in-one.sql` (still one paste for you).

## Phase 2 — Run the SQL integration suite against the live project

- [x] [me] Execute `supabase/tests/rls_rpc_tests.sql` — 19/19 PASSED live (19 assertions: cross-store isolation, RPC arithmetic/validation, guard triggers, append-only history, soft-delete, stats scoping).
- [x] [me] Fix any red assertion — two real bugs found and fixed (guard trigger 00008, count semantics 00009); zero leftover test data verified (script self-wipes).
- [x] Expected: all 19 passed — CONFIRMED. Zero test data left behind (verified).

## Phase 3 — Close code gaps (from STATUS.md audit)

- [ ] History pagination (replace `limit(50)` / `limit(100)` with count + paging, consistent with the existing pagination pattern).
- [ ] Category management UI (rename/archive; schema ready).
- [ ] Product image upload (R5-constrained design: private bucket, signed URL display, no transforms):
  - upload path = `{storeId}/{productId}/{uuid}-{safeName}`; client-side size < 20MB + MIME allowlist;
  - display via `createSignedUrl` (short expiry, reuse per session);
  - remove/replace image edits (old object cleanup);
  - tests: upload path sanitization, signed-URL wiring through fake storage, RLS-negative case stays covered in the SQL suite.
- [ ] Frontend tests for each new behavior (suite currently 57/57 passing — keep green).

## Phase 4 — Production readiness (SCOPE CANCELLED for open-source release)

Decision (project owner, Aug 2026): this is now an **open-source reference project**, not a
hosted commercial product. The custom-SMTP / CAPTCHA / rate-limit / backup-automation work
was removed to keep the repo simple for anyone cloning it. What remains documented for
self-hosts:

- Supabase platform defaults for auth rate limits and the built-in mailer *2 emails/hour* cap
- "Before going live" section in the README (3 short items, no automation)

## Phase 5 — Backup automation (SCOPE CANCELLED for open-source release)

Folded into the README "Before going live" note (3 lines). Research finding R4 stays for anyone self-hosting (Supabase CLI `db dump` + off-site copy + a restore drill).

## Phase 6
 — Privacy & compliance docs (from R1)

- [ ] `docs/PRIVACY.md` — cites **Loi n° 18-07 du 10 juin 2018 modifiée et complétée par la loi n° 25-11 du 24 juillet 2025 (JO n° 48)**; data categories (owner account, product, supplier, carnet PII); controller = store owner for carnet entries, platform = processor; minimisation + archive-not-delete posture; **flagged for Algerian counsel**: DPO designation + registre des activités de traitement (art. 41 bis, 41 bis 2/3) + registre des violations (art. 43) applicability to a micro-merchant SaaS (ANPDP communiqué points at commercial individuals, but application threshold needs confirmation).
- [ ] `docs/STATUS.md` refresh at the end (final verified state + remaining gaps + test counts).

## Phase 7 — Repo hardening (optional but cheap)

- [ ] `git init` + baseline commit; GitHub Actions: `npm ci && npm test` (57 tests) on push; note: SQL suite stays manual-by-design (creates throwaway auth users).

---

## Explicitly out of scope (unchanged, from STATUS.md)

Arabic/RTL functional (structure ready — by design v1) · hard delete anywhere (soft-delete constraint wins; carnet PII deletion remains an operator decision) · POS/billing/multi-store/CSV import/offline sync · image transforms (Pro-gated) · PITR (only worth it on Pro, with revenue).
