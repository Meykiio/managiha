import { fr as carnet } from "./carnet";
import { fr as core } from "./core";
import { fr as dashboard } from "./dashboard";
import { fr as inventory } from "./inventory";
import { fr as products } from "./products";
import { fr as reports } from "./reports";
import { fr as scanner } from "./scanner";
import { fr as settings } from "./settings";
import { fr as suppliers } from "./suppliers";

/**
 * French is the reference locale: TranslationKey is derived from it, so adding a
 * key here is a compile error everywhere until the other locales catch up.
 */
export const fr = {
  ...carnet,
  ...core,
  ...dashboard,
  ...inventory,
  ...products,
  ...reports,
  ...scanner,
  ...settings,
  ...suppliers,
} as const;

export type TranslationKey = keyof typeof fr;
