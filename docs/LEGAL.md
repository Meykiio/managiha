# Legal pack (Phase 5)

**This file is a template and a runbook, not legal advice.** Two items in it need
review by someone qualified before Managiha is relied on commercially: the Arabic
and English privacy texts, and the cross-border transfer position. Both are
flagged below rather than quietly decided.

---

## 1. Roles

| Role | Who |
|---|---|
| Data controller (responsable du traitement) | The shop owner using Managiha |
| Data processor (sous-traitant) | Supabase (database, auth, storage) |
| Software publisher | Not a processor. Cannot see shop data; RLS prevents it |

The distinction matters: erasure and access requests from a shop's customers go
to the **shop**, not to the publisher. Managiha's job is to give the shop the tools
to answer them.

## 2. Registre des traitements

Article 35 of Loi 18-07 requires a record of processing activities. One row per
purpose, to be kept by the controller (the shop owner).

| # | Purpose | Data categories | Data subjects | Legal basis | Retention | Recipients |
|---|---|---|---|---|---|---|
| 1 | Account management and authentication | Email, password hash, name, phone | Shop owner | Contract | Life of account | Supabase (auth) |
| 2 | Stock management | Product names, prices, quantities, movements, images | None (business data) | Contract | Accounting retention | Supabase (db, storage) |
| 3 | Credit book | Customer name, phone, free-text note, balance, transactions | Shop's customers | Contract / legitimate interest | Accounting retention; personal data erasable on request | Supabase (db) |
| 4 | Supplier records | Name, phone, WhatsApp, address, notes | Supplier contacts | Legitimate interest | Until archived | Supabase (db) |
| 5 | Security and abuse prevention | Authentication logs, IP, timestamps | Shop owner | Legitimate interest | Per Supabase policy | Supabase |
| 6 | Error reporting (optional, off by default) | Stack traces, browser metadata. **No business data.** | Shop owner | Legitimate interest | Per Sentry policy | Sentry |

### Cross-border transfer — NOT RESOLVED

Loi 18-07 restricts transferring personal data outside Algeria. It requires either
an authorisation from the **ANPDP** (Autorité Nationale de Protection des Données
Personnelles) or proof of an adequate level of protection in the destination
country.

**Action required before commercial use:** confirm the region the Supabase project
is hosted in, and whether that destination needs an ANPDP authorisation. Currently
undetermined. Do not assume "Supabase is compliant" — the compliance obligation
sits with the controller.

## 3. Rights runbook

### 3.1 Right of access (droit d'accès)

```sql
-- Run as the store owner from the app, or by the operator.
select public.export_carnet_customer('<customer-uuid>');
```

Returns one JSON document containing the customer record, every credit-book
transaction, and any recorded erasures. One call answers the request completely
instead of reading five tables by hand.

### 3.2 Right of erasure (droit à l'effacement)

```sql
select public.anonymize_carnet_customer(
  '<customer-uuid>',
  'demande du <date>, référence <ticket>'
);
```

What it does and, more importantly, what it refuses:

- **Anonymises, does not delete.** `full_name`, `phone` and `notes` are cleared;
  the customer is archived. The transaction **amounts survive**, because they are
  financial records with their own retention obligation and deleting them would
  destroy evidence the shop is entitled to keep.
- **Refuses while the balance is non-zero.** The debt is a legitimate claim. The
  request is not refused outright, it is deferred until the debt is settled or
  written off. Silently anonymising a debtor would erase the shop's own evidence.
- **Idempotent.** Re-running is a no-op, not an error, because a repeated request
  is normal when someone chases a ticket.
- **Logged.** A row lands in `data_erasure_log` with the reason and the operator,
  so the shop can evidence compliance. That table has a SELECT policy and no write
  policy: only the function can write it, so the log cannot be forged.

There is deliberately **no UI button** for this. The product rule is that a
shopkeeper must never be one tap away from destroying a ledger; erasure is an
explicit operation with a recorded reason. To file a request, the customer
contacts the shop, and the shop runs the call above.

### 3.3 Right of rectification

Ordinary editing. The customer name, phone and note are directly editable in the
carnet UI.

### 3.4 Right to object and to portability

No processing is carried out for marketing or profiling, so there is nothing to
object to in practice. Portability is served by the CSV exports on the reports
pages and by `export_carnet_customer`.

## 4. Privacy policy

`src/pages/privacy/` holds one document per locale: `content.fr.ts` (reference),
`content.en.ts`, `content.ar.ts`. The page resolves its own content by locale
rather than through `t()`, because a legal document is not interface chrome and
the i18n completeness test should not treat a legal decision as a build failure.

**Review required:** the English and Arabic texts are accurate translations, but a
privacy policy is a legal instrument. Have both reviewed by someone qualified
before relying on them. The Arabic review is the same item already tracked for the
Arabic interface terminology.

## 5. What is not built, and why

- **Cookie consent banner.** Not needed: no advertising cookies, no third-party
  analytics, no profiling. The only local storage is the language, the theme, and
  the authentication session — all strictly necessary or user-initiated. If a
  consent banner appears over this, it is worse than useless: it trains people to
  dismiss the one that matters.
- **Data Processing Agreement with Supabase.** Supabase publishes standard terms;
  the controller should retain a copy. Not a code artefact.
- **Breach notification process.** Loi 18-07 requires notifying the ANPDP of a
  breach. This is an operational process for the operator, not a feature. Write it
  before launch.
