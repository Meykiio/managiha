import { beforeEach, describe, expect, it } from "vitest";
import { setLanguage, t } from "../index";

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
