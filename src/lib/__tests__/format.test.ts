import { describe, expect, it } from "vitest";
import {
  fmtMoney,
  fmtMoneyShort,
  signedAmount,
  signedQty,
  fmtDate,
  fmtDateTime,
  initials,
  normalizePhoneForWa,
  waLink,
} from "../format";

describe("fmtMoney", () => {
  it("formats DZD amounts with French grouping", () => {
    expect(fmtMoney(12500)).toMatch(/12\s500,00\sDZD/);
  });

  it("formats zero", () => {
    expect(fmtMoney(0)).toMatch(/0,00\sDZD/);
  });

  it("handles null and undefined as zero", () => {
    expect(fmtMoney(null)).toMatch(/0,00\sDZD/);
    expect(fmtMoney(undefined)).toMatch(/0,00\sDZD/);
  });

  it("supports decimals for quantities of money", () => {
    expect(fmtMoney(1500.5)).toMatch(/1\s500,50\sDZD/);
  });
});

describe("fmtMoneyShort", () => {
  it("drops decimals for integers", () => {
    expect(fmtMoneyShort(1500)).toMatch(/1\s500\sDZD/);
  });

  it("keeps decimals for fractional values", () => {
    expect(fmtMoneyShort(1500.25)).toMatch(/1\s500,25\sDZD/);
  });
});

describe("signedQty / signedAmount", () => {
  it("prefixes positive quantities with +", () => {
    expect(signedQty(3)).toBe("+3");
  });

  it("prefixes negative quantities with -", () => {
    expect(signedQty(-2.5)).toBe("-2,5");
  });

  it("renders zero unsigned", () => {
    expect(signedQty(0)).toBe("0");
  });

  it("signs amounts with DZD", () => {
    expect(signedAmount(500)).toBe("+500 DZD");
    expect(signedAmount(-75.5)).toBe("-75,50 DZD");
  });
});

describe("fmtDate / fmtDateTime", () => {
  it("formats ISO dates as dd/MM/yyyy", () => {
    expect(fmtDate("2026-08-23")).toBe("23/08/2026");
  });

  it("returns a dash for null", () => {
    expect(fmtDate(null)).toBe("—");
  });

  it("formats date and time together", () => {
    expect(fmtDateTime("2026-08-23T14:30:00")).toMatch(/23\/08\/2026\s14:30/);
  });
});

describe("initials", () => {
  it("takes the first two name parts", () => {
    expect(initials("Karim Benali")).toBe("KB");
  });

  it("handles a single word", () => {
    expect(initials("Karim")).toBe("K");
  });

  it("falls back on empty input", () => {
    expect(initials(null)).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("normalizePhoneForWa", () => {
  it("converts local 0-prefixed numbers to +213 format digits", () => {
    expect(normalizePhoneForWa("0550 12 34 56")).toBe("213550123456");
  });

  it("strips + prefix", () => {
    expect(normalizePhoneForWa("+213550123456")).toBe("213550123456");
  });

  it("strips 00 international prefix", () => {
    expect(normalizePhoneForWa("00213550123456")).toBe("213550123456");
  });

  it("returns null for unusable input", () => {
    expect(normalizePhoneForWa(null)).toBeNull();
    expect(normalizePhoneForWa("abc")).toBeNull();
    expect(normalizePhoneForWa("")).toBeNull();
  });
});

describe("waLink", () => {
  it("builds a wa.me link with the encoded message", () => {
    const url = waLink("0550 12 34 56", "Bonjour Ahmed");
    expect(url).toMatch(/^https:\/\/wa\.me\/213550123456\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1])).toBe("Bonjour Ahmed");
  });

  it("returns null when there is no phone number", () => {
    expect(waLink(null, "msg")).toBeNull();
  });
});
