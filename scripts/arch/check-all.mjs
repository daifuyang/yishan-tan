#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const checks = [
  "scripts/arch/check-routes.mjs",
  "scripts/arch/check-actions.mjs",
  "scripts/arch/check-services.mjs",
  "scripts/arch/check-naming.mjs",
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
