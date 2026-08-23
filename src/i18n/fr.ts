import { fr as frCore } from "./fr-core";
import { fr as frPages } from "./fr-pages";

export const fr = {
  ...frCore,
  ...frPages,
} as const;

export type TranslationKey = keyof typeof fr;