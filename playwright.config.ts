import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * The suite runs against the built preview server with placeholder Supabase
 * credentials. Public pages (login, signup, privacy, 404) exercise the real
 * routes; anything behind auth is deliberately out of scope here, because a
 * meaningful authenticated flow needs a seeded database and that belongs with the
 * SQL suites rather than duplicated here.
 *
 * One browser on purpose. The value of this suite is the accessibility assertions
 * and the locale matrix, not cross-browser rendering, and running three engines
 * triples CI time for coverage axe already gives in one.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // The build runs separately (`npm run gate:e2e` chains it) because doing it
    // inside the webServer command meant a slow build counted against the server
    // start timeout, and because a build failure should be a build failure rather
    // than a mysterious server timeout.
    //
    // --host 127.0.0.1 is load-bearing on Windows: vite otherwise binds
    // `localhost`, which resolves to IPv6 ::1, and the health check against
    // 127.0.0.1 never connects.
    //
    // Note there are no Supabase credentials here, and there cannot usefully be.
    // Vite inlines `import.meta.env.VITE_*` at build time, so setting them on this
    // preview process would have no effect on the bundle — which is exactly the
    // bug that made this suite pass vacuously in CI. The placeholder credentials
    // live in `.env.test`, loaded by `vite build --mode test`. See that file.
    command: "npx vite preview --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
