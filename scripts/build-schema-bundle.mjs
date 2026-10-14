/**
 * Builds supabase/all-in-one.sql and supabase/master-schema.sql by concatenating
 * supabase/migrations/*.sql in filename order.
 *
 * These two files used to be maintained by hand, which is how `checkout_sale`
 * went missing from both of them while the README told every new contributor to
 * run them. Generating them removes the drift instead of documenting it.
 *
 * Usage: npm run db:bundle
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase", "migrations");

const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migrations found in", migrationsDir);
  process.exit(1);
}

const first = files[0].slice(0, 14);
const last = files[files.length - 1].slice(0, 14);

const sections = files.map((name) => {
  const version = name.slice(0, 14);
  const body = readFileSync(join(migrationsDir, name), "utf8").trimEnd();
  return [
    `-- ══════════════════════════════════════════════════════════════════════`,
    `-- ${version}  ${name.slice(15)}`,
    `-- ══════════════════════════════════════════════════════════════════════`,
    "",
    body,
  ].join("\n");
});

const bundle = [
  "-- Managiha database schema, generated file. Do not edit by hand.",
  "--",
  "-- Source:    supabase/migrations/*.sql, concatenated in filename order.",
  "-- Regenerate: npm run db:bundle",
  `-- Covers:     migrations ${first} through ${last} (${files.length} files).`,
  "--",
  "-- NOT idempotent. Migrations use plain CREATE TABLE, so this script is meant",
  "-- for a FRESH database. To reset an existing one use `supabase db reset`,",
  "-- which replays the migration files themselves.",
  "",
  "begin;",
  "",
  sections.join("\n\n"),
  "",
  "commit;",
  "",
].join("\n");

for (const target of ["all-in-one.sql", "master-schema.sql"]) {
  writeFileSync(join(root, "supabase", target), bundle, "utf8");
  console.log(`wrote supabase/${target} (${files.length} migrations, ${bundle.split("\n").length} lines)`);
}