import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    // Strip console.* and debugger from production bundles. import.meta.env.DEV
    // checks elsewhere are also resolved by SWC at build time.
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Split heavy vendor groups into long-cacheable chunks so the
        // landing page only fetches what it needs. lucide-react is
        // intentionally NOT chunked here so per-page tree-shaking keeps
        // working (otherwise the full ~780 kB icon set is bundled).
        manualChunks: {
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts":   ["recharts"],
          "vendor-query":    ["@tanstack/react-query"],
        },
      },
    },
  },
  esbuild: {
    // Keep console.error/warn (useful in prod). Strip noisy debug calls.
    pure: mode === "production" ? ["console.log", "console.debug", "console.info"] : [],
    drop: mode === "production" ? ["debugger"] : [],
  },
}));
