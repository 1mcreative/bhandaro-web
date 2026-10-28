import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Pages cannot send headers, so the CSP ships as a <meta> tag in production builds (dev needs inline scripts for HMR).
export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, process.cwd(), "VITE_").VITE_API_URL ?? "";
  if (mode === "production" && !api) throw new Error("VITE_API_URL must be set for production builds");
  return {
    base: "./", // relative assets: works on any Pages path; routing is hash-based so no server fallback needed
    plugins: [
      react(),
      {
        name: "csp-meta",
        transformIndexHtml(html: string, ctx: { server?: unknown }) {
          if (ctx.server) return html;
          const csp = `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ${api}; base-uri 'none'; object-src 'none'; form-action 'self'`;
          return html.replace("</title>", `</title>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="no-referrer" />`);
        },
      },
    ],
    test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"], globals: true },
  };
});
