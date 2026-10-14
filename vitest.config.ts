import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,testx}.{ts,tsx}", "src/**/*.test.{ts,tsx}"],

    // Single fork, on purpose. Vitest's default thread pool starts one jsdom
    // environment per worker, and on this machine the gate intermittently died
    // with "Zone Allocation failed - process out of memory" while running four
    // node processes back to back (lint, tsc, vitest, vite build). A gate that
    // fails for environmental reasons teaches people to ignore it, which is worse
    // than a slower gate. 97 tests run fine in one process.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});