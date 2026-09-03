import { ar as arCore } from "./ar-core";
import { ar as arPages } from "./ar-pages";
import type { TranslationKey } from "./fr";

/**
 * Typed as a full Record so `tsc` fails the build whenever a key exists in the
 * French source dictionary but is missing here.
 */
export const ar: Record<TranslationKey, string> = {
  ...arCore,
  ...arPages,
};
