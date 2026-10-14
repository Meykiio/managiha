import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Theme switching.
 *
 * The design system's Token Layer rule is "CSS custom properties in :root and
 * [data-theme]. Zero JS for theming" — so this provider does exactly one thing:
 * it sets `data-theme` on <html> and remembers the choice. It does not compute
 * or inject any colour. Every value comes from src/index.css.
 *
 * Default is dark, per the system ("Default theme | Dark").
 *
 * An inline script in index.html applies the stored value before first paint.
 * Without it the app renders dark and then flashes to light for anyone who chose
 * light, which is exactly the kind of flash the system's own UX Principles rule
 * out.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "managiha_theme";
const DEFAULT_THEME: Theme = "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
});

function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Private mode or a blocked storage partition. Fall through to the default.
  }
  return DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? DEFAULT_THEME : readStoredTheme()
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not worth failing over: the theme still applies for this session.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Same as above.
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Exported so index.html can inline the same key and default. */
export const THEME_STORAGE_KEY = STORAGE_KEY;
export const THEME_DEFAULT = DEFAULT_THEME;
