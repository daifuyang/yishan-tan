#!/usr/bin/env node
/**
 * 把 TanStack Start 构建产物组装成 deploy/fc/code/（app 包）+ deploy/fc/code-migrator/（migrator 包）。
 *
 * app 输出（vite Nitro 模式）：
 *   .output/  -> code/.output/
 *   deploy/fc/server/bootstrap  -> code/bootstrap
 *   package.json  -> code/package.json
 *
 * migrator 输出（esbuild bundle of scripts/db-migrate.ts）：
 *   db/migrations/  -> code-migrator/db/migrations/
 *   scripts/db-migrate.ts  bundled  -> code-migrator/migrate.mjs
 *   deploy/fc/server/migrator-bootstrap  -> code-migrator/bootstrap
 *   package.json  -> code-migrator/package.json
 */

import { spawnSync } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployBase = path.join(root, "deploy/fc");
const appCodeDir = path.join(deployBase, "code");
const migratorCodeDir = path.join(deployBase, "code-migrator");

function rmrf(p) {
  if (!existsSync(p)) return;
  return fs.rm(p, { recursive: true, force: true });
}

async function buildAppPackage() {
  const outDir = path.join(root, ".output");
  if (!existsSync(outDir)) {
    throw new Error(
      ".output not found, run `npm run build` first (vite.config must use nitro/vite plugin)",
    );
  }
  if (!existsSync(path.join(outDir, "server", "index.mjs"))) {
    throw new Error(".output/server/index.mjs missing; build must emit Nitro output");
  }

  console.log("[build-fc][app] preparing code dir");
  await rmrf(appCodeDir);
  await fs.mkdir(appCodeDir, { recursive: true });

  console.log("[build-fc][app] copying .output/");
  await fs.cp(outDir, path.join(appCodeDir, ".output"), { recursive: true });

  console.log("[build-fc][app] copying bootstrap");
  await fs.cp(path.join(deployBase, "server/bootstrap"), path.join(appCodeDir, "bootstrap"));

  console.log("[build-fc][app] writing package.json");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const slim = {
    name: pkg.name,
    version: pkg.version,
    type: "module",
    engines: pkg.engines,
    scripts: { start: "node .output/server/index.mjs" },
  };
  await fs.writeFile(path.join(appCodeDir, "package.json"), JSON.stringify(slim, null, 2));
}

async function buildMigratorPackage() {
  console.log("[build-fc][migrator] preparing code dir");
  await rmrf(migratorCodeDir);
  await fs.mkdir(migratorCodeDir, { recursive: true });

  const migrationsSrc = path.join(root, "db/migrations");
  if (!existsSync(migrationsSrc)) {
    throw new Error("db/migrations not found; nothing to migrate");
  }
  console.log("[build-fc][migrator] copying db/migrations/");
  await fs.cp(migrationsSrc, path.join(migratorCodeDir, "db/migrations"), { recursive: true });

  console.log("[build-fc][migrator] bundling scripts/db-migrate.ts -> migrate.mjs");
  const result = spawnSync(
    path.join(root, "node_modules/.bin/esbuild"),
    [
      "scripts/db-migrate.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=esm",
      "--banner:js=process.on('uncaughtException', e => { console.error('[uncaught]', e?.stack ?? e); process.exit(1); }); process.on('unhandledRejection', e => { console.error('[unhandledRejection]', e?.stack ?? e); process.exit(1); });",
      `--outfile=${path.join(migratorCodeDir, "migrate.mjs")}`,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`esbuild bundle failed with exit ${result.status}`);
  }

  console.log("[build-fc][migrator] copying migrator-bootstrap");
  await fs.cp(
    path.join(deployBase, "server/migrator-bootstrap"),
    path.join(migratorCodeDir, "bootstrap"),
  );

  console.log("[build-fc][migrator] writing package.json");
  const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const slim = {
    name: `${pkg.name}-migrator`,
    version: pkg.version,
    type: "module",
    engines: pkg.engines,
    private: true,
    scripts: { start: "node migrate.mjs" },
  };
  await fs.writeFile(path.join(migratorCodeDir, "package.json"), JSON.stringify(slim, null, 2));
}

async function main() {
  await buildAppPackage();
  await buildMigratorPackage();
  console.log("[build-fc] done");
}

main().catch((err) => {
  console.error("[build-fc] failed", err instanceof Error ? err.message : err);
  process.exit(1);
});
