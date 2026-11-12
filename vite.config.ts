import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { type Plugin, defineConfig, searchForWorkspaceRoot } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Aliases must be resolved by Vite core as well: Nitro's SSR dev worker loads
// route modules through the module runner, where vite-tsconfig-paths' resolveId
// hook is not applied.
const srcDir = fileURLToPath(new URL("./src/", import.meta.url)).replace(/\\/g, "/");

/**
 * lowcode-next 引擎（低代码编辑器）的接入。
 *
 * 引擎是**未发布**的私有 monorepo（`~/workspace/study/lowcode-next`），本项目以
 * **源码形态**引入：Vite alias 把 `@lowcode-next/<pkg>` 指到它的 `packages/<pkg>/src`。
 * 引擎目录不存在时（CI、部署机、同事机器）全部指向本地替身模块，构建照过，
 * 设计页给一句「编辑器未启用」的提示。
 *
 * 目录位置：`LOWCODE_NEXT_DIR` 环境变量优先，默认 `../../study/lowcode-next`
 * （项目在 `workspace/products/yishan-tan`，引擎在 `workspace/study/lowcode-next`）。
 */
const engineRoot = (() => {
  const fromEnv = process.env.LOWCODE_NEXT_DIR;
  const candidate = fromEnv
    ? fileURLToPath(new URL(fromEnv, import.meta.url))
    : fileURLToPath(new URL("../../study/lowcode-next/", import.meta.url));
  return existsSync(candidate) ? candidate.replace(/\\/g, "/") : null;
})();

/**
 * 引擎包 → 源码目录。顺序要紧：alias 是**前缀匹配**，更具体的必须排在前面
 * （`materials-demo-react` / `materials-react` 要在 `materials` 之前，
 * 否则会被 `materials` 吃掉前缀，剩下一段拼不上的路径）。
 */
const ENGINE_PACKAGES = [
  "protocol",
  "model",
  "drag",
  "materials-demo-react",
  "materials-react",
  "materials",
  "renderer-core",
  "renderer",
  "render-react",
  "designer-core",
  "designer-react",
  "designer-ui",
  "lowcode-react",
] as const;

const engineStub = fileURLToPath(
  new URL("./src/components/admin/portal/lowcode/engine-unavailable.ts", import.meta.url),
);

const engineAliases = engineRoot
  ? ENGINE_PACKAGES.map((name) => ({
      find: `@lowcode-next/${name}`,
      replacement: `${engineRoot}/packages/${name}/src`,
    }))
  : [
      // 替身是**文件**，子路径（`materials-react/basic`）必须单独映射到它，
      // 否则 alias 会把剩下的 `/basic` 拼到文件名后面。
      { find: "@lowcode-next/materials-react/basic", replacement: engineStub },
      ...ENGINE_PACKAGES.map((name) => ({
        find: `@lowcode-next/${name}`,
        replacement: engineStub,
      })),
    ];

/**
 * 引擎的 `designer-react` 里有 shadcn 风格的 UI 组件，用的是 Tailwind 工具类。
 * 引擎源码在项目目录之外，Tailwind 默认扫不到 → 那些类名会**静默失效**
 * （样式全丢但不报错）。这里把引擎的 src 追加进 `@source`。
 *
 * 细节：绝对路径必须用正斜杠（反斜杠会扫到 0 个文件）；插件必须排在
 * `tailwindcss()` 之前 —— 两者都是 `enforce: 'pre'`，数组顺序决定谁先跑。
 */
function lowcodeTailwindSource(): Plugin {
  return {
    name: "yishan-tan:lowcode-tailwind-source",
    enforce: "pre",
    transform(code, id) {
      if (!engineRoot) return null;
      const file = id.split("?")[0] ?? id;
      if (!file.endsWith("/src/styles/globals.css")) return null;
      const directive = `@source "${engineRoot}/packages/designer-react/src";`;
      if (code.includes(directive)) return null;
      return { code: `${code}\n${directive}\n`, map: null };
    },
  };
}

export default defineConfig({
  resolve: {
    alias: [{ find: /^[~@]\//, replacement: srcDir }, ...engineAliases],
    // 引擎的包各自带 pnpm 的 node_modules，会解析到**另一份 react** ——
    // 两份 React 会让 hooks 直接失效。dedupe 让它们共用宿主这一份。
    dedupe: ["clsx", "tailwind-merge", "class-variance-authority"],
  },
  plugins: [
    // Nitro makes `vite build` emit TanStack Start's production artifact at
    // `.output/server/index.mjs` with all deps pre-bundled by rollup — i.e. the
    // FC deploy package no longer has to ship node_modules.
    nitro(),
    // 必须在 tailwindcss() 之前：两者都是 enforce:'pre'，数组顺序生效。
    lowcodeTailwindSource(),
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
  optimizeDeps: {
    // Monaco 体积大且不适合被预打包；排除掉走原生 ESM。
    exclude: ["monaco-editor", "@monaco-editor/react"],
  },
  server: {
    port: Number(process.env.PORT ?? 3000),
    host: true,
    cors: true,
    strictPort: false,
    allowedHosts: true,
    fs: {
      // 引擎源码在项目外：Monaco worker 的真实路径会穿过引擎自己的
      // `node_modules/.pnpm/...`，所以要放行**引擎根目录**，只放行
      // `packages/designer-react` 不够。
      // （Vite 的 fs.allow 会**替换**默认值，所以要把 workspace root 一起带上。）
      allow: engineRoot ? [searchForWorkspaceRoot(process.cwd()), engineRoot] : undefined,
    },
  },
  preview: {
    port: Number(process.env.PORT ?? 3000),
    host: true,
    cors: true,
    strictPort: false,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
  },
});
