import { ar as carnet } from "./carnet";
import { ar as core } from "./core";
import { ar as dashboard } from "./dashboard";
import { ar as inventory } from "./inventory";
import { ar as products } from "./products";
import { ar as reports } from "./reports";
import { ar as scanner } from "./scanner";
import { ar as settings } from "./settings";
import { ar as suppliers } from "./suppliers";
import type { TranslationKey } from "../fr";

/**
 * Typed as `Record<TranslationKey, string>` so a missing Arabic key is a compile
 * error, the same guarantee the English locale has.
 */
export const ar: Record<TranslationKey, string> = {
  ...carnet,
  ...core,
  ...dashboard,
  ...inventory,
  ...products,
  ...reports,
  ...scanner,
  ...settings,
  ...suppliers,
};