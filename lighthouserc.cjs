/**
 * Lighthouse CI budget.
 *
 * Budgets, not targets: these are the numbers that fail the build. The design
 * system's Performance section sets its own targets (<100ms first render, <50ms
 * interaction, 60fps, <2s data p95) which a synthetic Lighthouse run cannot
 * measure, so these are the closest network-level proxies and the system's stated
 * numbers stay as product goals in the PR review rather than as a CI gate that
 * cannot honestly check them.
 *
 * Accessibility is asserted at 100 on purpose. The axe suite already enforces
 * zero violations on the public routes; if Lighthouse ever disagrees, one of the
 * two is wrong and the build should stop and say so.
 */
module.exports = {
  ci: {
    collect: {
      // The public routes only. Anything behind auth needs a seeded database, and
      // auditing a login redirect would measure the redirect, not the page.
      url: [
        "http://127.0.0.1:4173/login",
        "http://127.0.0.1:4173/signup",
        "http://127.0.0.1:4173/privacy",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        // The app talks to a placeholder Supabase host in this environment, so
        // some connection attempts fail by design. Auditing the UI is the point.
        skipAudits: ["uses-http2"],
      },
      startServerCommand:
        "npx vite preview --port 4173 --strictPort --host 127.0.0.1",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 60000,
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.8 }],
        "color-contrast": "error",
        "image-alt": "error",
        "label": "error",
        "link-name": "error",
        "button-name": "error",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
