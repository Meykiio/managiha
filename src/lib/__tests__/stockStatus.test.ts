import { describe, expect, it } from "vitest";
import { getStockStatus } from "../stockStatus";

describe("getStockStatus", () => {
  it("flags zero stock as out", () => {
    expect(getStockStatus(0, 5)).toBe("out");
  });

  it("flags negative stock as out", () => {
    expect(getStockStatus(-3, null)).toBe("out");
  });

  it("flags stock at the threshold as low (boundary included)", () => {
    expect(getStockStatus(5, 5)).toBe("low");
  });

  it("flags stock under the threshold as low", () => {
    expect(getStockStatus(4.5, 5)).toBe("low");
  });

  it("flags stock above the threshold as healthy", () => {
    expect(getStockStatus(6, 5)).toBe("healthy");
  });

  it("treats missing threshold as healthy when stock is positive", () => {
    expect(getStockStatus(1, null)).toBe("healthy");
    expect(getStockStatus(1, undefined)).toBe("healthy");
  });

  it("matches the products_overview SQL view contract", () => {
    expect(getStockStatus(0, null)).toBe("out");
    expect(getStockStatus(10, null)).toBe("healthy");
    expect(getStockStatus(2, 2)).toBe("low");
  });
});
