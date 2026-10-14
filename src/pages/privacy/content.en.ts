import type { PrivacyContent } from "./types";

export const privacyEn: PrivacyContent = {
  title: "Privacy policy",
  lastUpdated: "Last updated: October 2026",
  backLabel: "Back to login",
  intro:
    "Managiha is stock and credit-book software for small shops. This page explains what data is processed, why, for how long, and how to exercise your rights.",
  sections: [
    {
      heading: "1. Who is responsible",
      paragraphs: [
        "The data controller is the shop owner who uses Managiha. They decide what is recorded and they answer requests from the people concerned.",
        "The software publisher cannot see your shop's data. Each shop is isolated at the database level by row-level security: an account can only read and change its own shop's data.",
      ],
    },
    {
      heading: "2. What is processed",
      bullets: [
        "Account: email address, password (stored as a hash by the authentication service, never in clear text), and your full name and phone number if you provide them.",
        "Shop: name, address, phone, currency and language.",
        "Catalogue: product names, barcodes, references, prices, alert thresholds, expiry dates and photographs.",
        "Stock movements: type, quantity, reason, note, date and author.",
        "Credit book: customer name, phone, free-text note, amounts of credit and payments, and balance.",
        "Suppliers: name, phone, WhatsApp number, address and notes.",
      ],
    },
    {
      heading: "3. Purposes and legal bases",
      bullets: [
        "Providing the service you asked for: managing your stock, your credit book and your reports. Basis: performance of a contract.",
        "Keeping the service secure: authentication, logging and abuse prevention. Basis: legitimate interest.",
        "Meeting your accounting obligations: retaining movements and transactions. Basis: legal obligation.",
      ],
      paragraphs: [
        "No data is used for advertising, sold, or passed to third parties. The software contains no advertising trackers and no third-party analytics.",
      ],
    },
    {
      heading: "4. Your customers' data",
      paragraphs: [
        "The credit book holds personal data about your customers (name, phone, balance). You are responsible for that data: you must collect it for a legitimate reason, not keep it longer than necessary, and answer their access or erasure requests.",
        "Managiha provides the tools to do so: a full export of one customer's data, and anonymisation of their personal data while keeping the accounting amounts. Anonymisation is refused while the balance is not zero, because the debt is legitimate evidence for the shop.",
      ],
    },
    {
      heading: "5. How long it is kept",
      bullets: [
        "Account and shop data: while the account exists, then deleted on request.",
        "Stock movements and credit-book transactions: kept to meet accounting obligations, including after personal data has been anonymised.",
        "Product photographs: deleted when you replace them or archive the product.",
        "Authentication logs: kept by the authentication service for service security.",
      ],
    },
    {
      heading: "6. Recipients and processors",
      paragraphs: [
        "Data is hosted by Supabase, which provides the database, authentication and image storage, and acts as a processor. No other third party has access to the data.",
        "Optional technical error reports (Sentry) are only active if the operator configures them, and do not contain your shop's business data.",
      ],
    },
    {
      heading: "7. Transfers outside Algeria",
      paragraphs: [
        "Law 18-07 governs the transfer of personal data abroad and in principle requires authorisation from the National Authority for the Protection of Personal Data (ANPDP), or an adequate level of protection in the destination country.",
        "The hosting region must be checked against that requirement before any commercial use. The software does not settle this question: it has to be confirmed by a qualified adviser for your situation.",
      ],
    },
    {
      heading: "8. Your rights",
      paragraphs: [
        "Under Law 18-07 you have the right to access, rectify, erase, object to and port your data.",
        "To exercise these rights over your account data, contact the operator of the service. For credit-book data, contact the shop concerned, which is the controller.",
        "If you believe your rights are not respected, you can refer the matter to the National Authority for the Protection of Personal Data (ANPDP).",
      ],
    },
    {
      heading: "9. Security",
      bullets: [
        "Encryption in transit (TLS) between your browser and the service.",
        "Per-shop isolation at the database level: every query is filtered by owner.",
        "Stock and balances are written only through server functions, so the browser cannot set an amount or a final quantity.",
        "An immutable audit log of stock movements and credit-book transactions.",
        "History is not editable: a correction is a new record, never a rewrite.",
      ],
    },
    {
      heading: "10. Local storage in your browser",
      bullets: [
        "Chosen language and light or dark theme: stored locally to avoid a flash on load.",
        "Authentication session: a token managed by the authentication service.",
      ],
      paragraphs: [
        "No advertising cookies are set. Nothing is tracked for commercial purposes.",
      ],
    },
    {
      heading: "11. Changes",
      paragraphs: [
        "This policy may be updated. The date at the top of the page shows the current version. A substantial change will be announced in the application.",
      ],
    },
  ],
};
