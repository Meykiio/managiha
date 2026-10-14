import { describe, expect, it } from "vitest";
import { computeMargin } from "../margin";

describe("computeMargin", () => {
  it("computes the margin rate on the selling price, not as markup on cost", () => {
    // Buy 100, sell 150: the margin rate is 50/150 = 33%, not 50%. Getting this
    // backwards makes a product look a third more profitable than it is.
    const m = computeMargin(150, 100);
    expect(m.absolute).toBe(50);
    expect(m.percent).toBeCloseTo(33.33, 1);
  });

  it("flags a product selling below what it cost", () => {
    const m = computeMargin(80, 100);
    expect(m.absolute).toBe(-20);
    expect(m.belowCost).toBe(true);
    expect(m.percent).toBeCloseTo(-25, 1);
  });

  it("does not claim a zero-cost product is pure profit", () => {
    // The common case in a shop that only sometimes writes down what it paid.
    const m = computeMargin(150, null);
    expect(m.absolute).toBeNull();
    expect(m.percent).toBeNull();
    expect(m.belowCost).toBe(false);
  });

  it("treats a cost of zero as unknown rather than as free stock", () => {
    expect(computeMargin(150, 0).percent).toBeNull();
  });

  it("treats a zero sell price as unpriced, not as a total loss", () => {
    const m = computeMargin(0, 100);
    expect(m.absolute).toBeNull();
    expect(m.belowCost).toBe(false);
  });

  it("reports a break-even line honestly", () => {
    const m = computeMargin(100, 100);
    expect(m.absolute).toBe(0);
    expect(m.percent).toBe(0);
    expect(m.belowCost).toBe(false);
  });
});
