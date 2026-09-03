import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANGUAGES,
  getLocale,
  initLanguage,
  isLanguage,
  setLanguage,
  subscribeLanguage,
  t,
} from "../index";
import { fr } from "../fr";
import { ar } from "../ar";
import { en } from "../en";

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

  it("keeps English left-to-right", () => {
    setLanguage("en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("ignores an unsupported code and falls back to French", () => {
    setLanguage("de");
    expect(document.documentElement.lang).toBe("fr");
    expect(t("nav.dashboard")).toBe("Tableau de bord");
  });
});

describe("translation coverage", () => {
  afterEach(() => {
    setLanguage("fr");
  });

  it("translates the same key per language", () => {
    setLanguage("ar");
    expect(t("nav.dashboard")).toBe("لوحة التحكم");
    setLanguage("en");
    expect(t("nav.dashboard")).toBe("Dashboard");
  });

  it("interpolates params in every language", () => {
    setLanguage("en");
    expect(t("common.page", { page: 2, total: 9 })).toBe("Page 2 of 9");
    setLanguage("ar");
    expect(t("common.page", { page: 2, total: 9 })).toBe("صفحة 2 من 9");
  });

  // Guards against a half-translated release: a key added to French later must
  // not silently ship as French text inside the Arabic or English UI.
  it.each([
    ["ar", ar],
    ["en", en],
  ])("%s defines every French key", (_code, dict) => {
    const missing = Object.keys(fr).filter((key) => !(key in dict));
    expect(missing).toEqual([]);
  });

  it("has no empty strings in any dictionary", () => {
    for (const dict of [fr, ar, en]) {
      const blank = Object.entries(dict)
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => key);
      expect(blank).toEqual([]);
    }
  });
});

describe("language metadata", () => {
  afterEach(() => {
    setLanguage("fr");
  });

  it("exposes the three supported languages", () => {
    expect(LANGUAGES.map((meta) => meta.code)).toEqual(["fr", "ar", "en"]);
  });

  it("returns an Intl locale per language for number and date formatting", () => {
    setLanguage("ar");
    expect(getLocale()).toBe("ar-DZ-u-nu-latn-ca-gregory");
    setLanguage("en");
    expect(getLocale()).toBe("en-GB");
  });

  // Algerian price tags and invoices use Latin digits; Eastern Arabic numerals
  // would make stock counts and money unfamiliar at a glance.
  it("formats Arabic numbers with Latin digits", () => {
    setLanguage("ar");
    expect(new Intl.NumberFormat(getLocale()).format(42)).toBe("42");
  });

  it("validates language codes", () => {
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("de")).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});

describe("subscriptions", () => {
  afterEach(() => {
    setLanguage("fr");
  });

  it("notifies subscribers so React can re-render on switch", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLanguage(listener);
    setLanguage("ar");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setLanguage("en");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when the language is unchanged", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLanguage(listener);
    setLanguage("fr");
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLanguage("fr");
  });

  afterEach(() => {
    window.localStorage.clear();
    setLanguage("fr");
  });

  it("restores the stored language on startup", () => {
    setLanguage("ar");
    expect(initLanguage()).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("defaults to French when nothing is stored", () => {
    window.localStorage.clear();
    expect(initLanguage()).toBe("fr");
  });

  it("skips persistence when asked to", () => {
    setLanguage("en", { persist: false });
    window.localStorage.clear();
    expect(initLanguage()).toBe("fr");
  });
});
