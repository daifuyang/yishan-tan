import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tanstackStart(), react(), tsconfigPaths()],
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
