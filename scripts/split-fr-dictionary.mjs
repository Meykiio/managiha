/**
 * One-off: split the flat French dictionary into domain files under
 * src/i18n/locales/fr/. Trilingual support requires per-locale per-domain files,
 * because a single flat file for one locale already exceeds the 250-line limit
 * and three locales would be ~900 lines.
 *
 * The script verifies that the union of the output keys is exactly the input key
 * set, so nothing can be silently dropped or duplicated in the move.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const i18nDir = join(root, "src", "i18n");
const outDir = join(i18nDir, "locales", "fr");

// "key": "value"   or   "key":\n    "value"
const ENTRY = /"([a-zA-Z0-9_.]+)":\s*(?:"((?:[^"\\]|\\.)*)"|\r?\n\s*"((?:[^"\\]|\\.)*)")/g;

function readEntries(file) {
  const src = readFileSync(file, "utf8");
  const map = new Map();
  let m;
  while ((m = ENTRY.exec(src)) !== null) {
    map.set(m[1], m[2] !== undefined ? m[2] : m[3]);
  }
  return map;
}

const core = readEntries(join(i18nDir, "fr-core.ts"));
const pages = readEntries(join(i18nDir, "fr-pages.ts"));

// Later file wins on collision, matching the spread order used by fr.ts today.
const all = new Map([...core, ...pages]);

const DOMAINS = {
  core: [
    "app.", "nav.", "common.", "offline.", "errorBoundary.", "toast.", "validate.",
    "notFound.", "configError.", "storeMissing.", "auth.", "imageUpload.",
  ],
  dashboard: ["dash."],
  products: ["products.", "productDetail.", "productForm.", "productSelect.", "categoryCombo.", "categoryManage."],
  inventory: ["inventory."],
  carnet: ["carnet.", "customerDetail.", "customerSelect.", "customerForm.", "carnetEntry."],
  suppliers: ["suppliers."],
  reports: ["reports."],
  settings: ["settings."],
  scanner: ["scanner.", "receipt."],
};

function domainFor(key) {
  for (const [domain, prefixes] of Object.entries(DOMAINS)) {
    if (prefixes.some((p) => key.startsWith(p))) return domain;
  }
  return "core";
}

const buckets = {};
for (const key of all.keys()) {
  const domain = domainFor(key);
  (buckets[domain] ??= new Map()).set(key, all.get(key));
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const written = [];
for (const [domain, entries] of Object.entries(buckets)) {
  const lines = [`/** French (fr) - ${domain} domain. */`, "export const fr = {", ""];
  for (const [key, value] of entries) {
    lines.push(`  "${key}": ${JSON.stringify(value)},`);
  }
  lines.push("} as const;", "");
  writeFileSync(join(outDir, `${domain}.ts`), lines.join("\n"), "utf8");
  written.push([domain, entries.size, lines.length]);
}

const indexImports = Object.keys(buckets)
  .sort()
  .map((d) => `import { fr as ${d} } from "./${d}";`)
  .join("\n");

const indexBody = Object.keys(buckets)
  .sort()
  .map((d) => `  ...${d},`)
  .join("\n");

writeFileSync(
  join(outDir, "index.ts"),
  [
    indexImports,
    "",
    `/**`,
    ` * French is the reference locale: TranslationKey is derived from it, so adding a`,
    ` * key here is a compile error everywhere until the other locales catch up.`,
    ` */`,
    "export const fr = {",
    indexBody,
    "} as const;",
    "",
    "export type TranslationKey = keyof typeof fr;",
    "",
  ].join("\n"),
  "utf8"
);

// ── Safety net ──────────────────────────────────────────────────────────────
const emitted = new Set();
for (const [, entries] of Object.entries(buckets)) {
  for (const key of entries.keys()) {
    if (emitted.has(key)) throw new Error(`duplicate key emitted: ${key}`);
    emitted.add(key);
  }
}
const missing = [...all.keys()].filter((k) => !emitted.has(k));
const extra = [...emitted].filter((k) => !all.has(k));
if (missing.length || extra.length) {
  throw new Error(`key drift. missing=${missing.length} extra=${extra.length}\nmissing: ${missing.join(", ")}\nextra: ${extra.join(", ")}`);
}

console.log(`input keys: ${all.size}`);
for (const [domain, count, lines] of written.sort((a, b) => b[1] - a[1])) {
  console.log(`  fr/${domain}.ts`.padEnd(28), `${count} keys, ${lines} lines`);
}
console.log("verified: output key set === input key set");