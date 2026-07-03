#!/usr/bin/env node
/**
 * 把 TanStack Start 构建产物组装成 fc-deploy/code/，供 FC 上传。
 *
 * TanStack Start 输出到 .output/（Nitro 模式）或 dist/（Vite 默认 SSR 模式）。
 * 默认优先使用 .output，缺失时回退 dist。
 *
 * 输出：fc-deploy/code/
 *   - .output/  或  dist/（按实际存在）
 *   - public/（项目根 public/）
 *   - bootstrap（启动脚本）
 *   - package.json（薄包）
 */

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployCodeDir = path.join(root, "fc-deploy/code");

function rmrf(p) {
  if (!existsSync(p)) return;
  return fs.rm(p, { recursive: true, force: true });
}

function pickOutputDir() {
  const candidates = [".output", "dist"];
  for (const candidate of candidates) {
    const abs = path.join(root, candidate);
    if (existsSync(abs)) return { kind: candidate, abs };
  }
  return null;
}

async function main() {
  const picked = pickOutputDir();
  if (!picked) {
    console.error("[build-fc] .output / dist not found, run `pnpm build` first");
    process.exit(1);
  }

  console.log(`[build-fc] preparing code dir (using ${picked.kind}/)`);
  await rmrf(deployCodeDir);
  await fs.mkdir(deployCodeDir, { recursive: true });

  console.log(`[build-fc] copying ${picked.kind}`);
  await fs.cp(picked.abs, path.join(deployCodeDir, picked.kind), { recursive: true });

  console.log("[build-fc] copying public/ (if any)");
  const publicDir = path.join(root, "public");
  if (existsSync(publicDir)) {
    await fs.cp(publicDir, path.join(deployCodeDir, "public"), { recursive: true });
  }

  console.log("[build-fc] copying bootstrap");
  await fs.cp(path.join(root, "fc-deploy/server/bootstrap"), path.join(deployCodeDir, "bootstrap"));

  console.log("[build-fc] writing package.json");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const slim = {
    name: pkg.name,
    version: pkg.version,
    type: "module",
    engines: pkg.engines,
  };
  await fs.writeFile(path.join(deployCodeDir, "package.json"), JSON.stringify(slim, null, 2));

  console.log("[build-fc] writing start shim");
  const shim = `#!/usr/bin/env bash
set -euo pipefail
cd /code
export NODE_ENV="${"${NODE_ENV:-production}"}"
export PORT="${"${PORT:-9000}"}"
OUT="${picked.kind}"
if [ -f "$OUT/server/index.mjs" ]; then
  exec node "$OUT/server/index.mjs"
elif [ -f "$OUT/server.js" ]; then
  exec node "$OUT/server.js"
else
  echo "no server entry found in $OUT" >&2
  exit 1
fi
`;
  await fs.writeFile(path.join(deployCodeDir, "start.sh"), shim, { mode: 0o755 });

  console.log("[build-fc] done");
}

main().catch((err) => {
  console.error("[build-fc] failed", err);
  process.exit(1);
});
