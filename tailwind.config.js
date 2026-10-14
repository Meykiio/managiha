import type { Config } from "tailwindcss";

/**
 * Tokens from the "SaaS Analytics" design system (Reference Build 01).
 *
 * Colours map to CSS custom properties, not literals, so one `data-theme`
 * attribute on <html> repaints the application with no JavaScript involved. That
 * is the system's own Token Layer rule, and it is why the palette below contains
 * no hex values: the hex lives in src/index.css, once per theme.
 *
 * WHAT TO CHANGE: only the five brand values in src/index.css. This file is
 * structural and should stay as it is.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    /* Declared here rather than under `extend` on purpose. `extend` merges, so
       rounded-3xl (24px) would survive and a soft decorative corner could creep
       back in. Replacing the scale outright is the only way the near-square rule
       is enforceable rather than aspirational. */
    borderRadius: {
      none: "0",
      xs: "2px",
      sm: "4px",
      DEFAULT: "4px",
      md: "6px",
      lg: "8px",
      xl: "12px",
      "2xl": "16px",
      full: "9999px",
    },
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--bg)",
          dim: "var(--bg-dim)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          mid: "var(--surface-mid)",
          high: "var(--surface-high)",
          highest: "var(--surface-highest)",
        },
        body: {
          DEFAULT: "var(--on-surface)",
          soft: "var(--on-surface-soft)",
          muted: "var(--on-surface-muted)",
        },
        line: {
          DEFAULT: "var(--outline)",
          hi: "var(--outline-hi)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          solid: "var(--primary-solid)",
          tint: "var(--primary-tint)",
          "tint-strong": "var(--primary-tint-strong)",
          brand: "var(--brand-blue)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          tint: "var(--secondary-tint)",
        },
        tertiary: {
          DEFAULT: "var(--tertiary)",
          tint: "var(--tertiary-tint)",
        },
        quaternary: {
          DEFAULT: "var(--quaternary)",
          tint: "var(--quaternary-tint)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          tint: "var(--positive-tint)",
          fg: "var(--positive-fg)",
        },
        error: {
          DEFAULT: "var(--error)",
          tint: "var(--error-tint)",
          fg: "var(--error-fg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          tint: "var(--warning-tint)",
          fg: "var(--warning-fg)",
        },
        info: {
          DEFAULT: "var(--info)",
          tint: "var(--info-tint)",
          fg: "var(--info-fg)",
        },
        /* Literal, theme-independent values: text on a coloured surface, and
           the overlay scrim. These must NOT flip with the theme. */
        onPrimary: "var(--on-primary)",
        onSecondary: "var(--on-secondary)",
        scrim: "rgba(0, 0, 0, 0.5)",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      /* Near-square radius scale lives at theme level above, not here. */

      /* Elevation scale from the system. Values are themed, not literal. */
      boxShadow: {
        sm: "var(--shadow-sm)",
        card: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        popover: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      transitionTimingFunction: {
        snappy: "var(--ease-snappy)",
        smooth: "var(--ease-smooth)",
        spring: "var(--ease-spring)",
      },

      transitionDuration: {
        fast: "var(--dur-fast)",
        med: "var(--dur-med)",
        slow: "var(--dur-slow)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        "fade-in": "fade-in var(--dur-med) var(--ease-snappy)",
        "scale-in": "scale-in var(--dur-med) var(--ease-spring)",
        "slide-up": "slide-up var(--dur-med) var(--ease-snappy)",
      },
    },
  },
  plugins: [],
} satisfies Config;
