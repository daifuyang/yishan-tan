#!/usr/bin/env node
/**
 * 宪章 §12.1 / §12.2 守卫入口(DESIGN_CHARTER.md):
 *   - §12.1:check-routes / check-actions / check-services / check-naming
 *   - §7.0:check-list-pages（资源列表搜索 + 表格结构）
 *   - §12.2(待补):check-ui-tokens(P1,Phase 2 第 8 条)/ check-ui-naming(P2,Phase 3 第 5 条)
 */
import { spawnSync } from "node:child_process";

const checks = [
  "scripts/arch/check-routes.mjs",
  "scripts/arch/check-actions.mjs",
  "scripts/arch/check-services.mjs",
  "scripts/arch/check-naming.mjs",
  "scripts/arch/check-list-pages.mjs",
];

let failed = 0;
for (const file of checks) {
  const result = spawnSync(process.execPath, [file], { stdio: "inherit" });
  if (result.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\n[arch:check] ${failed}/${checks.length} check(s) failed`);
  process.exit(1);
}
console.log("\n[arch:check] all passed");
