import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Architecture guards. These read source rather than behaviour, because the
 * failures they catch are invisible to rendering tests.
 *
 * The motivating bug: DashboardPage declared
 *
 *   const STATUS_LABEL = { healthy: t("products.status.healthy"), ... };
 *
 * at module scope. `t()` resolves against module state at call time, so that
 * object froze the language at import. Switching to Arabic re-rendered the app and
 * left every stock-status badge in French, and no render test noticed because the
 * badges were technically "translated" from the dictionary.
 */

// __dirname is src/i18n/__tests__, so the app root is two levels up.
const SRC = path.resolve(__dirname, "..", "..");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "i18n") continue;
      sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Module scope = a top-level statement, i.e. not nested in a declaration body. */
function moduleScopeTCalls(file: string): string[] {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const hits: string[] = [];
  let depth = 0;
  let inBlockComment = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith("//")) return;

    // A `t(` is at module scope only when nothing is open around it.
    if (depth === 0 && /\bt\(\s*["'`]/.test(trimmed)) {
      hits.push(`${path.relative(SRC, file)}:${i + 1}: ${trimmed.slice(0, 80)}`);
    }

    // Track brace depth. Imports and export declarations are depth 0.
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (depth < 0) depth = 0;
  });

  return hits;
}

describe("i18n architecture guards", () => {
  const files = sourceFiles(SRC);

  it("finds source files to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("has no module-scope t() calls", () => {
    const offenders = files.flatMap(moduleScopeTCalls);
    expect(
      offenders,
      "t() outside a component freezes the language at import time. Call it " +
        "during render instead.",
    ).toEqual([]);
  });

  it("uses translation keys in real components", () => {
    const sidebar = fs.readFileSync(
      path.join(SRC, "components", "layout", "Sidebar.tsx"),
      "utf8"
    );
    expect(sidebar).toMatch(/t\(\s*["'`]nav\./);
  });
});