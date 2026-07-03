#!/usr/bin/env node
/**
 * 规则：
 *  - Zod schema 文件名以 XxxSchema 后缀（匹配 .schema.(ts|tsx)）
 *  - service 命名 xxxService 导出
 *  - 文件命名要求：features/<domain>/<domain>.<kind>.ts
 *    kind ∈ {schema, types, actions, service, policy, queries, queries}/ 即 .keep 占位
 *  - REST 资源首段使用复数命名，允许在资源目录下放子资源（例如 users/me.ts）
 *
 * 仅做提示性检查，遇到违规就报错。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { listFiles, readIfExists, report } from "./_shared.mjs";

const REST_OK = /^\/api\/v1\/([a-z0-9-]+)(\.|$)/;

async function checkFeaturesNaming() {
  const dirs = await fs.readdir("src/features", { withFileTypes: true });
  let violations = 0;
  for (const ent of dirs) {
    if (!ent.isDirectory()) continue;
    const domain = ent.name;
    const dir = path.join("src/features", domain);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const seenFiles = entries.filter((e) => e.isFile()).map((e) => e.name);
    for (const filename of seenFiles) {
      if (filename === ".keep") continue;
      const expectedPrefix = `${domain}.`;
      if (!filename.startsWith(expectedPrefix)) {
        report(
          `${dir}/${filename}`,
          0,
          `文件名应以领域前缀 '${expectedPrefix}' 开头，建议改为 '${domain}.${filename}'`,
          "check-naming",
        );
        violations += 1;
      }
    }
  }
  return violations;
}

function isPluralResource(name) {
  if (/^[a-z]+$/.test(name) && name.endsWith("s")) return true;
  if (/^[a-z-]+$/.test(name) && /ies$/.test(name)) return true;
  return false;
}

async function checkRestNaming() {
  const files = await listFiles("src/routes/api/v1");
  let violations = 0;
  for (const file of files) {
    const rel = file.replace("src/routes/api/v1/", "");
    const relNoExt = rel.replace(/\.(ts|tsx)$/, "");
    const segments = relNoExt.split(path.sep);
    const resource = segments[0];
    if (!resource) continue;
    if (!isPluralResource(resource)) {
      report(file, 0, `REST 顶级资源名建议使用复数（当前 '${resource}'）`, "check-naming");
      violations += 1;
      continue;
    }
    if (segments.length > 1) continue;
    const restPath = `/api/v1/${relNoExt}`;
    if (!REST_OK.test(restPath)) {
      // 文件形如 <resource>.ts 必然匹配；这里是冗余防御
      continue;
    }
    const fileName = path.basename(file);
    const stem = fileName.replace(/\.(ts|tsx)$/, "");
    if (stem.includes("/")) continue;
    if (!isPluralResource(stem)) {
      report(file, 0, `REST 资源名建议使用复数（当前 '${stem}'）`, "check-naming");
      violations += 1;
    }
  }
  return violations;
}

async function main() {
  const a = await checkFeaturesNaming();
  const b = await checkRestNaming();
  const total = a + b;
  if (total > 0) {
    console.error(`[check-naming] ${total} violation(s)`);
    process.exit(1);
  }
  console.log("[check-naming] OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
