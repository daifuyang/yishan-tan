#!/usr/bin/env node
/**
 * 规则：
 *  - features/<domain>/*.service.ts 不允许 import React, '~/routes', '~/components'
 *  - service 中允许 import 错误工厂与 context 类型
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
  /^react$/,
  /^react-dom$/,
  /\/components\//,
  /\/routes\//,
  /\.\.\/components\//,
  /\.\.\/routes\//,
];

const ALLOW = [
  /^~\/?lib\/errors$/,
  /^~\/?lib\/service-context$/,
  /^~\/?lib\/authorization\.server$/,
];

async function main() {
  const files = await listFiles("src/features");
  let violations = 0;
  for (const file of files) {
    if (isInTestPath(file)) continue;
    if (!/\.service\.(ts|tsx)$/.test(file)) continue;
    const source = await readIfExists(file);
    if (!source) continue;
    const imports = extractImports(source);
    for (const imp of imports) {
      if (ALLOW.some((re) => re.test(imp.source))) continue;
      for (const rule of FORBIDDEN) {
        if (rule.test(imp.source)) {
          report(
            file,
            lineNumberAt(source, source.indexOf(imp.raw)),
            `service.ts 不允许引用 ${imp.source}`,
            "check-services",
          );
          violations += 1;
        }
      }
    }
  }
  if (violations > 0) {
    console.error(`[check-services] ${violations} violation(s)`);
    process.exit(1);
  }
  console.log("[check-services] OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
