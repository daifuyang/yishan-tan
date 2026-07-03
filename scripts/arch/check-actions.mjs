#!/usr/bin/env node
/**
 * 规则：
 *  - features/<domain>/<domain>.actions.ts 不能直接访问 db.server / drizzle-orm / postgres
 *  - actions 必须经过 service
 */
import {
  extractImports,
  isInTestPath,
  lineNumberAt,
  listFiles,
  readIfExists,
  report,
} from "./_shared.mjs";

const FORBIDDEN = [/~?\/?lib\/db\.server/, /drizzle-orm/, /\bpostgres\b/];

async function main() {
  const files = await listFiles("src/features");
  let violations = 0;
  for (const file of files) {
    if (isInTestPath(file)) continue;
    if (!/\.actions\.(ts|tsx)$/.test(file)) continue;
    const source = await readIfExists(file);
    if (!source) continue;
    const imports = extractImports(source);
    for (const imp of imports) {
      for (const rule of FORBIDDEN) {
        if (rule.test(imp.source)) {
          report(
            file,
            lineNumberAt(source, source.indexOf(imp.raw)),
            `actions.ts 不允许直接引用 ${imp.source}，必须经过 service`,
            "check-actions",
          );
          violations += 1;
        }
      }
    }
  }
  if (violations > 0) {
    console.error(`[check-actions] ${violations} violation(s)`);
    process.exit(1);
  }
  console.log("[check-actions] OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
