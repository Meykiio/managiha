import { fr, type TranslationKey } from "./locales/fr";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

export type { TranslationKey };

export type Direction = "ltr" | "rtl";

export interface LocaleMeta {
  code: string;
  /** Name of the language written in that language, which is the convention for
   *  language pickers: someone who cannot read the current UI can still find
   *  their own language. */
  label: string;
  dir: Direction;
}

/**
 * Adding a language is three steps: add it to `locales`, import its assembled
 * dictionary and register it in `dictionaries`. The completeness test fails if
 * the dictionary is missing keys, so a half-finished translation cannot ship.
 */
export const locales: Record<string, LocaleMeta> = {
  fr: { code: "fr", label: "Français", dir: "ltr" },
  en: { code: "en", label: "English", dir: "ltr" },
  ar: { code: "ar", label: "العربية", dir: "rtl" },
};

type Dictionary = Partial<Record<TranslationKey, string>>;

const dictionaries: Record<string, Dictionary> = {
  fr,
  en,
  ar,
};

/** The reference locale. Any key missing elsewhere falls back to it. */
export const FALLBACK_LANGUAGE = "fr";

const STORAGE_KEY = "managiha_language";

let current = FALLBACK_LANGUAGE;
const listeners = new Set<(code: string) => void>();

function metaFor(code: string): LocaleMeta {
  return locales[code] ?? locales[FALLBACK_LANGUAGE];
}

function applyDocument(code: string): void {
  if (typeof document === "undefined") return;
  const meta = metaFor(code);
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
}

export function isSupported(code: string): boolean {
  return code in dictionaries;
}

export function availableLanguages(): LocaleMeta[] {
  return Object.values(locales);
}

export function getLanguage(): string {
  return current;
}

export function getDirection(): Direction {
  return metaFor(current).dir;
}

/**
 * localStorage exists so the correct language paints on first render rather than
 * flashing French while the store row loads. The store setting is authoritative
 * and overwrites this value once it arrives.
 */
export function initLanguage(): void {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isSupported(stored)) current = stored;
  } catch {
    // Private mode or a blocked storage partition. Not worth failing over.
  }
  applyDocument(current);
}

export function setLanguage(code: string): void {
  if (!isSupported(code)) return;
  current = code;
  applyDocument(code);
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Same as above.
  }
  listeners.forEach((fn) => fn(code));
}

export function subscribeLanguage(fn: (code: string) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export type TranslationParams = Record<string, string | number>;

export function t(key: TranslationKey, params?: TranslationParams): string {
  const dict = dictionaries[current] ?? dictionaries[FALLBACK_LANGUAGE];
  let text = dict[key] ?? dictionaries[FALLBACK_LANGUAGE][key] ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }
  return text;
}