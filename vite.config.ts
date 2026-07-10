import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // Nitro makes `vite build` emit TanStack Start's production artifact at
    // `.output/server/index.mjs` with all deps pre-bundled by rollup — i.e. the
    // FC deploy package no longer has to ship node_modules.
    nitro(),
    tailwindcss(),
    tanstackStart({
      server: {
        build: {
          inlineCss: true,
        },
      },
    }),
    react(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ],
  ssr: {
    // Match yishan-flow: force-rollup to inline TanStack Start core into the
    // SSR bundle so .output does not depend on node_modules at runtime.
    noExternal: [
      "@tanstack/react-start",
      "@tanstack/react-start/server",
      "@tanstack/start-server-core",
    ],
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    host: true,
    cors: true,
    strictPort: false,
    allowedHosts: true,
  },
  preview: {
    port: Number(process.env.PORT ?? 3000),
    host: true,
    cors: true,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
  },
});
