import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// VITE_BASE=/bhandaro-web/ for GitHub Pages project sites
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"], globals: true },
});
