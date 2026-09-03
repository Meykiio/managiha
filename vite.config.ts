import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Sandboxed preview hosts (v0, Vercel) are proxied under these domains,
    // which Vite blocks by default.
    allowedHosts: [".vercel.run", ".vercel.app", "localhost"],
  },
});
