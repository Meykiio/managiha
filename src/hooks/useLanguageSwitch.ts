import { useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useOptionalAuth } from "../contexts/AuthContext";
import { LANGUAGES, setLanguage, useLanguage, type Language } from "../i18n";

interface LanguageSwitch {
  language: Language;
  languages: typeof LANGUAGES;
  /**
   * Applies the language immediately, then mirrors it to the store row so the
   * choice survives a new session or a different device.
   */
  change: (next: Language) => void;
}

export function useLanguageSwitch(): LanguageSwitch {
  const language = useLanguage();
  // The switcher also renders on the auth screens, outside AuthProvider.
  const auth = useOptionalAuth();
  const storeId = auth?.store?.id ?? null;

  const change = useCallback(
    (next: Language) => {
      if (next === language) return;
      setLanguage(next);

      // Signed-out visitors keep the local preference only; there is no row yet.
      if (!storeId) return;
      void supabase
        .from("stores")
        .update({ language: next })
        .eq("id", storeId)
        .then(({ error }) => {
          // A failed sync must not undo the switch the user just saw.
          if (error) console.error("[managiha] language sync failed", error.message);
        });
    },
    [language, storeId]
  );

  return { language, languages: LANGUAGES, change };
}
