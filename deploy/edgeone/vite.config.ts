import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Static SPA preview build for EdgeOne Makers.
// Deliberately does NOT include nitro() / ssr.noExternal from the main
// vite.config.ts, so the FC3 build chain is left untouched.
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: { enabled: false },
      },
    }),
    react(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  build: {
    target: "es2022",
  },
});
