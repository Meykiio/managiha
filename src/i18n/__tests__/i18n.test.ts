import { beforeEach, describe, expect, it } from "vitest";
import { setLanguage, t } from "../index";
import { fr, type TranslationKey } from "../locales/fr";
import { en } from "../locales/en";
import { ar } from "../locales/ar";

describe("t", () => {
  it("returns the French string for a known key", () => {
    expect(t("nav.dashboard")).toBe("Tableau de bord");
  });

  it("interpolates params", () => {
    expect(t("common.page", { page: 2, total: 9 })).toBe("Page 2 sur 9");
  });

  it("interpolates the same param multiple times", () => {
    expect(t("carnet.balance.owed", { amount: "150 DZD" })).toBe("Doit 150 DZD");
  });

  it("falls back to the key itself when unknown", () => {
    expect(t("totally.missing.key" as never)).toBe("totally.missing.key");
  });
});

describe("setLanguage", () => {
  beforeEach(() => {
    setLanguage("fr");
  });

  it("sets html lang and ltr direction for French", () => {
    setLanguage("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("switches to rtl direction for Arabic (RTL readiness)", () => {
    setLanguage("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    setLanguage("fr");
  });
});

/**
 * Key parity for English is enforced at compile time by typing the assembled
 * dictionary as `Record<TranslationKey, string>`. These tests cover what the
 * compiler cannot: values that exist but are unusable.
 */
describe("locale dictionaries", () => {
  const localesUnderTest: [string, Record<string, string>][] = [
    ["fr", fr],
    ["en", en],
    ["ar", ar],
  ];

  it.each(localesUnderTest)("%s has no empty values", (_code, dict) => {
    const empty = Object.entries(dict)
      .filter(([, v]) => typeof v !== "string" || v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it.each(localesUnderTest)(
    "%s keeps the same {placeholders} as the reference locale",
    (_code, dict) => {
      const placeholders = (s: string) =>
        (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(",");

      const mismatched = Object.keys(fr).filter(
        (key) =>
          placeholders(dict[key] ?? "") !==
          placeholders(fr[key as TranslationKey]),
      );
      expect(mismatched).toEqual([]);
    },
  );

  it("every French key has an English value", () => {
    const missing = Object.keys(fr).filter((key) => en[key as TranslationKey] === undefined);
    expect(missing).toEqual([]);
  });

  it("every French key has an Arabic value", () => {
    const missing = Object.keys(fr).filter((key) => ar[key as TranslationKey] === undefined);
    expect(missing).toEqual([]);
  });

  it("renders Arabic text when Arabic is selected", () => {
    setLanguage("ar");
    expect(t("nav.dashboard")).toBe("لوحة التحكم");
    setLanguage("fr");
  });
});
