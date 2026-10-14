import { en as carnet } from "./carnet";
import { en as core } from "./core";
import { en as dashboard } from "./dashboard";
import { en as inventory } from "./inventory";
import { en as products } from "./products";
import { en as reports } from "./reports";
import { en as scanner } from "./scanner";
import { en as settings } from "./settings";
import { en as suppliers } from "./suppliers";
import type { TranslationKey } from "../fr";

/**
 * Typed as `Record<TranslationKey, string>` on purpose: a missing or extra key
 * becomes a compile error here rather than a key that silently falls back to
 * French at runtime. That is the whole point of the refactor.
 */
export const en: Record<TranslationKey, string> = {
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