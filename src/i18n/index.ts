import { useSyncExternalStore } from "react";
import { fr, type TranslationKey } from "./fr";
import { ar } from "./ar";
import { en } from "./en";

export type { TranslationKey };

export type Language = "fr" | "ar" | "en";

export type Direction = "ltr" | "rtl";

export interface LanguageMeta {
  code: Language;
  /** Native label, shown as-is in the language switcher. */
  label: string;
  dir: Direction;
  /** BCP 47 tag used for Intl number and date formatting. */
  locale: string;
}

/** Display order of the language switcher. */
export const LANGUAGES: readonly LanguageMeta[] = [
  { code: "fr", label: "Français", dir: "ltr", locale: "fr-FR" },
  // Latin digits and the Gregorian calendar are what Algerian price tags,
  // invoices, and phone keypads use, so stock counts and money stay readable.
  {
    code: "ar",
    label: "العربية",
    dir: "rtl",
    locale: "ar-DZ-u-nu-latn-ca-gregory",
  },
  { code: "en", label: "English", dir: "ltr", locale: "en-GB" },
];

export const DEFAULT_LANGUAGE: Language = "fr";

export const LANGUAGE_STORAGE_KEY = "managiha_language";

const dictionaries: Record<Language, Partial<Record<TranslationKey, string>>> = {
  fr,
  ar,
  en,
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.some((meta) => meta.code === value);
}

let currentLanguage: Language = DEFAULT_LANGUAGE;

/**
 * `t()` reads a module-level language, so React needs a nudge to re-render when
 * it changes. Components subscribe through `useLanguage()` instead of threading
 * the language through props.
 */
const listeners = new Set<() => void>();

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function getLanguageMeta(language: Language = currentLanguage): LanguageMeta {
  return LANGUAGES.find((meta) => meta.code === language) ?? LANGUAGES[0];
}

/** BCP 47 tag for `Intl` formatters. */
export function getLocale(language: Language = currentLanguage): string {
  return getLanguageMeta(language).locale;
}

export function getDirection(language: Language = currentLanguage): Direction {
  return getLanguageMeta(language).dir;
}

function readStoredLanguage(): Language | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* Private browsing or a blocked storage quota must not break switching. */
  }
}

function applyDocumentLanguage(language: Language): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = getDirection(language);
}

interface SetLanguageOptions {
  /** Remember the choice for the next visit. Defaults to true. */
  persist?: boolean;
}

export function setLanguage(language: string, options: SetLanguageOptions = {}): void {
  const next = isLanguage(language) ? language : DEFAULT_LANGUAGE;
  const { persist = true } = options;

  if (persist) storeLanguage(next);
  applyDocumentLanguage(next);

  if (next === currentLanguage) return;
  currentLanguage = next;
  for (const listener of listeners) listener();
}

/**
 * Restores the stored preference before the first render so the app never
 * flashes French at a shopkeeper who picked Arabic.
 */
export function initLanguage(): Language {
  currentLanguage = readStoredLanguage() ?? DEFAULT_LANGUAGE;
  applyDocumentLanguage(currentLanguage);
  return currentLanguage;
}

/** Re-renders the calling component whenever the language changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

type Params = Record<string, string | number>;

export function t(key: TranslationKey, params?: Params): string {
  const dict = dictionaries[currentLanguage] ?? fr;
  let text = dict[key] ?? fr[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return text;
}
