import type { MovementType, TransactionType, Unit } from "./types";

export const PAGE_SIZE = 20;

export interface UnitOption {
  value: Unit;
  label: string;
  short: string;
}

export const UNITS: UnitOption[] = [
  { value: "piece", label: "Pièce", short: "p" },
  { value: "kg", label: "Kilogramme", short: "kg" },
  { value: "g", label: "Gramme", short: "g" },
  { value: "liter", label: "Litre", short: "L" },
  { value: "box", label: "Boîte", short: "boîte" },
  { value: "pack", label: "Pack", short: "pack" },
];

export function unitLabel(unit: string): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export function unitShort(unit: string): string {
  return UNITS.find((u) => u.value === unit)?.short ?? "";
}

export interface MovementTypeOption {
  value: MovementType;
  label: string;
  direction: "in" | "out" | "delta";
}

export const MOVEMENT_TYPES: MovementTypeOption[] = [
  { value: "receive", label: "Réception", direction: "in" },
  { value: "sale", label: "Vente", direction: "out" },
  { value: "return", label: "Retour", direction: "in" },
  { value: "damage", label: "Dommage", direction: "out" },
  { value: "theft", label: "Vol", direction: "out" },
  { value: "count_adjustment", label: "Comptage", direction: "delta" },
  { value: "correction", label: "Correction", direction: "delta" },
  { value: "opening_balance", label: "Stock initial", direction: "in" },
];

export function movementLabel(type: string): string {
  return MOVEMENT_TYPES.find((m) => m.value === type)?.label ?? type;
}

export function movementDirection(type: string): "in" | "out" | "delta" {
  return MOVEMENT_TYPES.find((m) => m.value === type)?.direction ?? "delta";
}

export interface AdjustReasonOption {
  value: MovementType;
  label: string;
}

export const ADJUST_REASONS: AdjustReasonOption[] = [
  { value: "count_adjustment", label: "Comptage" },
  { value: "damage", label: "Dommage" },
  { value: "theft", label: "Vol" },
  { value: "correction", label: "Correction" },
];

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "credit", label: "Crédit" },
  { value: "payment", label: "Paiement" },
  { value: "adjustment", label: "Ajustement" },
];

export function transactionLabel(type: string): string {
  return TRANSACTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const SIDEBAR_COLLAPSED_KEY = "managiha_sidebar_collapsed";
