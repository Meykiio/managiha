import { en as enCore } from "./en-core";
import { en as enPages } from "./en-pages";
import type { TranslationKey } from "./fr";

/**
 * Typed as a full Record so `tsc` fails the build whenever a key exists in the
 * French source dictionary but is missing here.
 */
export const en: Record<TranslationKey, string> = {
  ...enCore,
  ...enPages,
};
