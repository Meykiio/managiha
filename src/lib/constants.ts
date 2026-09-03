import type { MovementType, TransactionType, Unit } from "./types";
import { t, type TranslationKey } from "../i18n";

export const PAGE_SIZE = 20;

export interface UnitOption {
  value: Unit;
  labelKey: TranslationKey;
  shortKey: TranslationKey;
}

export const UNITS: UnitOption[] = [
  { value: "piece", labelKey: "unit.piece", shortKey: "unit.short.piece" },
  { value: "kg", labelKey: "unit.kg", shortKey: "unit.short.kg" },
  { value: "g", labelKey: "unit.g", shortKey: "unit.short.g" },
  { value: "liter", labelKey: "unit.liter", shortKey: "unit.short.liter" },
  { value: "box", labelKey: "unit.box", shortKey: "unit.short.box" },
  { value: "pack", labelKey: "unit.pack", shortKey: "unit.short.pack" },
];

export function unitLabel(unit: string): string {
  const option = UNITS.find((u) => u.value === unit);
  return option ? t(option.labelKey) : unit;
}

export function unitShort(unit: string): string {
  const option = UNITS.find((u) => u.value === unit);
  return option ? t(option.shortKey) : "";
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
  const option = MOVEMENT_TYPES.find((m) => m.value === type);
  return option ? t(option.labelKey) : type;
}

export function movementDirection(type: string): "in" | "out" | "delta" {
  return MOVEMENT_TYPES.find((m) => m.value === type)?.direction ?? "delta";
}

export interface AdjustReasonOption {
  value: MovementType;
  labelKey: TranslationKey;
}

export const ADJUST_REASONS: AdjustReasonOption[] = [
  { value: "count_adjustment", labelKey: "movement.count_adjustment" },
  { value: "damage", labelKey: "movement.damage" },
  { value: "theft", labelKey: "movement.theft" },
  { value: "correction", labelKey: "movement.correction" },
];

export const TRANSACTION_TYPES: { value: TransactionType; labelKey: TranslationKey }[] = [
  { value: "credit", labelKey: "transaction.credit" },
  { value: "payment", labelKey: "transaction.payment" },
  { value: "adjustment", labelKey: "transaction.adjustment" },
];

export function transactionLabel(type: string): string {
  const option = TRANSACTION_TYPES.find((tx) => tx.value === type);
  return option ? t(option.labelKey) : type;
}

export const SIDEBAR_COLLAPSED_KEY = "managiha_sidebar_collapsed";
