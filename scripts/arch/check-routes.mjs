#!/usr/bin/env node
/**
 * 规则：
 *  - routes/** 不能直接 import ~/lib/db.server、~/lib/redis.server、~/lib/auth.server
 *  - routes/** 不能使用 drizzle-orm / better-auth / ioredis / postgres
 */
import {
  extractImports,
  isInTestPath,
  lineNumberAt,
  listFiles,
  readIfExists,
  report,
} from "./_shared.mjs";

const FORBIDDEN = [
  /drizzle-orm/,
  /\bpostgres\b/,
  /ioredis/,
  /better-auth/,
  /~?\/?lib\/db\.server/,
  /~?\/?lib\/redis\.server/,
  /~?\/?lib\/auth\.server/,
];

async function main() {
  const files = await listFiles("src/routes");
  let violations = 0;
  for (const file of files) {
    if (isInTestPath(file)) continue;
    const source = await readIfExists(file);
    if (!source) continue;
    const imports = extractImports(source);
    for (const imp of imports) {
      for (const rule of FORBIDDEN) {
        if (rule.test(imp.source)) {
          report(
            file,
            lineNumberAt(source, source.indexOf(imp.raw)),
            `routes 不允许直接引用 ${imp.source}`,
            "check-routes",
          );
          violations += 1;
        }
      }
    }
  }
  if (violations > 0) {
    console.error(`[check-routes] ${violations} violation(s)`);
    process.exit(1);
  }
  console.log("[check-routes] OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
