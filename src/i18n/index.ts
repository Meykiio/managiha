import { fr, type TranslationKey } from "./fr";

const dictionaries: Record<string, Partial<Record<TranslationKey, string>>> = {
  fr,
};

let currentLanguage = "fr";

export function setLanguage(language: string): void {
  currentLanguage = language;
  const dir = language === "ar" || language === "he" || language === "fa" ? "rtl" : "ltr";
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
}

export function getLanguage(): string {
  return currentLanguage;
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
