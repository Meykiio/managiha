import type { MovementType, TransactionType, Unit } from "./types";
import { t, type TranslationKey } from "../i18n";

export const PAGE_SIZE = 20;

/**
 * Labels live in the dictionary, not here. These values are rendered directly in
 * tables and forms, so baking French into the data structure meant the unit and
 * movement names stayed French in an Arabic and English interface.
 */
export interface UnitOption {
  value: Unit;
  labelKey: TranslationKey;
  /** kg, g and L are symbols, not words, and are identical in every locale. */
  short: string;
  shortKey?: TranslationKey;
}

export const UNITS: UnitOption[] = [
  { value: "piece", labelKey: "unit.piece", short: "", shortKey: "unit.short.piece" },
  { value: "kg", labelKey: "unit.kg", short: "kg" },
  { value: "g", labelKey: "unit.g", short: "g" },
  { value: "liter", labelKey: "unit.liter", short: "L" },
  { value: "box", labelKey: "unit.box", short: "", shortKey: "unit.short.box" },
  { value: "pack", labelKey: "unit.pack", short: "", shortKey: "unit.short.pack" },
];

export function unitLabel(unit: string): string {
  const found = UNITS.find((u) => u.value === unit);
  return found ? t(found.labelKey) : unit;
}

export function unitShort(unit: string): string {
  const found = UNITS.find((u) => u.value === unit);
  if (!found) return "";
  return found.shortKey ? t(found.shortKey) : found.short;
}

export interface MovementTypeOption {
  value: MovementType;
  labelKey: TranslationKey;
  direction: "in" | "out" | "delta";
}

export const MOVEMENT_TYPES: MovementTypeOption[] = [
  { value: "receive", labelKey: "movement.receive", direction: "in" },
  { value: "sale", labelKey: "movement.sale", direction: "out" },
  { value: "return", labelKey: "movement.return", direction: "in" },
  { value: "damage", labelKey: "movement.damage", direction: "out" },
  { value: "theft", labelKey: "movement.theft", direction: "out" },
  { value: "count_adjustment", labelKey: "movement.count_adjustment", direction: "delta" },
  { value: "correction", labelKey: "movement.correction", direction: "delta" },
  { value: "opening_balance", labelKey: "movement.opening_balance", direction: "in" },
];

export function movementLabel(type: string): string {
  const found = MOVEMENT_TYPES.find((m) => m.value === type);
  return found ? t(found.labelKey) : type;
}

export function movementDirection(type: string): "in" | "out" | "delta" {
  return MOVEMENT_TYPES.find((m) => m.value === type)?.direction ?? "delta";
}

export interface AdjustReasonOption {
  value: MovementType;
  labelKey: TranslationKey;
}

/**
 * Reasons offered by the adjust form.
 *
 * `return` was the one movement type with no producing screen: it is valid in the
 * schema and in MOVEMENT_TYPES, and nothing could write it. A customer bringing
 * goods back had to be recorded as a correction or not at all, which is why it is
 * here now.
 */
export const ADJUST_REASONS: AdjustReasonOption[] = [
  { value: "count_adjustment", labelKey: "movement.count_adjustment" },
  { value: "return", labelKey: "movement.return" },
  { value: "damage", labelKey: "movement.damage" },
  { value: "theft", labelKey: "movement.theft" },
  { value: "correction", labelKey: "movement.correction" },
];

export const TRANSACTION_TYPES: { value: TransactionType; labelKey: TranslationKey }[] = [
  { value: "credit", labelKey: "txType.credit" },
  { value: "payment", labelKey: "txType.payment" },
  { value: "adjustment", labelKey: "txType.adjustment" },
];

export function transactionLabel(type: string): string {
  const found = TRANSACTION_TYPES.find((x) => x.value === type);
  return found ? t(found.labelKey) : type;
}

export const SIDEBAR_COLLAPSED_KEY = "managiha_sidebar_collapsed";

/**
 * The name stored on a carnet customer whose personal data has been erased.
 *
 * A marker, not a label. `anonymize_carnet_customer` used to write the French
 * string 'Client anonymisé' straight into the row, which then appeared verbatim
 * in an Arabic or English session — the same class of defect as a hardcoded UI
 * string, one layer further down where it is harder to see.
 *
 * Components compare against this and render a translated label instead, so the
 * database carries no language.
 */
export const ANONYMISED_CUSTOMER_NAME = "[anonymised]";
