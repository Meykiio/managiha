import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getLanguage,
  initLanguage,
  setLanguage,
  subscribeLanguage,
} from "./index";

const LocaleContext = createContext<string>(getLanguage());

/**
 * Holds the active language and keeps `<html lang dir>` in sync.
 *
 * `t()` is a plain function reading module state, so components that only call
 * `t()` would not re-render when the language changes. Rather than thread a
 * hook through sixty call sites, the subtree is keyed on the locale: switching
 * language remounts it. That costs in-page state, which is the right trade for a
 * language switch, since it also guarantees no component is left holding text in
 * the previous language.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(getLanguage());

  useEffect(() => {
    initLanguage();
    setLocale(getLanguage());
    return subscribeLanguage((code) => setLocale(code));
  }, []);

  return (
    <LocaleContext.Provider value={locale} key={locale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): string {
  return useContext(LocaleContext);
}

/**
 * The store row is authoritative for the chosen language, so the provider adopts
 * it once it arrives. Called by the auth layer after the store loads.
 */
export function applyStoreLanguage(code: string | null | undefined): void {
  if (code) setLanguage(code);
}