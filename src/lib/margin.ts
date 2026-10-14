/**
 * Margin, expressed the way a shopkeeper talks about it.
 *
 * `percent` is the margin rate on the selling price — (sell - cost) / sell — which
 * is what "taux de marge" means in French retail and what a wholesaler will quote
 * back at you. It is not markup on cost: those differ by several points at the
 * same absolute profit, and mixing them up is how someone convinces themselves a
 * product is profitable.
 *
 * Returns nulls rather than zeros when a figure is unknown, because 0% margin and
 * "we do not know the cost price" are different facts and the second one is common
 * in a shop that only writes down what it paid sometimes.
 */
export interface Margin {
  /** Sell price minus cost price. */
  absolute: number | null;
  /** Margin rate on the selling price, as a percentage. */
  percent: number | null;
  /** True when the product sells for less than it cost. */
  belowCost: boolean;
}

export function computeMargin(
  sellPrice: number | null | undefined,
  costPrice: number | null | undefined
): Margin {
  const sell = Number(sellPrice ?? 0);
  const cost = costPrice == null ? null : Number(costPrice);

  if (cost == null || cost <= 0) {
    return { absolute: null, percent: null, belowCost: false };
  }
  if (sell <= 0) {
    // A product priced at zero is not "100% loss", it is unpriced.
    return { absolute: null, percent: null, belowCost: false };
  }

  const absolute = sell - cost;
  return {
    absolute,
    percent: (absolute / sell) * 100,
    belowCost: absolute < 0,
  };
}
