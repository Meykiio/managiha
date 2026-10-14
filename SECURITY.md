# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately through GitHub's
[security advisory](https://github.com/Meykiio/managiha/security/advisories/new)
form, or by email to the maintainer listed on the GitHub profile.

Please include:

- What the issue is and roughly how severe you think it is
- The steps to reproduce it
- Whether it needs an authenticated account, and of which kind

You will get an acknowledgement, an honest assessment of whether it is
exploitable, and credit in the fix unless you prefer otherwise. There is no
bug bounty — this is an unfunded project — but there is a genuine thank you.

## Supported versions

Only the latest commit on `main` is supported. There are no maintained release
branches, and fixes are not backported.

## What the security model actually is

Worth stating plainly, because it tells you where to look and what is already
handled.

**Tenancy is enforced by the database, not the client.** Every table carries
`store_id`. Row-level security grants access only when the row's store is owned
by `auth.uid()`, through the `private.is_store_owner(store_id)` helper. Every
operation has its own policy; there is deliberately no `DELETE` policy on any
table.

**Stock and money cannot be written directly.** `products.current_stock`,
`product_lots.quantity` and `carnet_customers.balance` are changed only by
`SECURITY DEFINER` functions that lock the row, validate, apply, and write the
audit row in a single transaction. Guard triggers reject a direct authenticated
write to those columns, so a compromised or tampered client cannot set a balance
to whatever it likes.

**Money is priced server-side.** `checkout_sale` reads `products.sell_price`
itself. The cart sent from the browser carries no price, so a tampered client
cannot decide what something costs.

**Retries are safe.** Every mutating call carries a `p_client_op_id`, recorded in
`idempotency_keys` with a unique constraint. Replaying a request returns the
original result rather than selling twice.

**Demand for proof, not assertions.** The invariants above are measured by six
SQL suites in `supabase/tests/` — 96 assertions covering cross-store isolation,
the guard triggers, FEFO allocation, and append-only history. They run against a
real PostgreSQL and self-clean. If you think an invariant is not enforced, that is
where to check whether it already is.

## Known, deliberate limitations

These are accepted, not overlooked. Please do not report them as findings:

- **No application-level rate limiting.** Signup, login and password reset rely
  on Supabase's platform defaults. If you self-host for real users, enable CAPTCHA
  and Leaked Password Protection, and bring your own SMTP — see
  [docs/DEPLOY.md](docs/DEPLOY.md).
- **`anon` cannot read `stores` at all.** This is intended post-migration-00014
  behaviour, not a permission bug.
- **Soft-delete only.** Archived rows remain in the database. This is deliberate:
  a shop's sales history is its record. The carnet erasure path anonymises
  in place rather than deleting, and says so in the UI.

## What must never happen in a contribution

- The `service_role` key must never appear in client code, in an environment
  variable prefixed `VITE_`, or in any file committed to the repository. Only the
  publishable/anon key belongs in `.env`.
- No secret may be committed. `.env`, `.env.*` and `.vercel` are gitignored;
  `.env.example` carries placeholders and nothing else.
- No raw SQL string interpolation from user input anywhere.
