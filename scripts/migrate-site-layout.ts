/**
 * 旧页面 → 全站公共布局 的数据迁移（页头页脚从各页面里抽到 `portal_site_layout`）。
 *
 * 用法：
 *   npm run db:migrate-site-layout -- --dry-run          # 只出报告，不写任何数据（先跑这个）
 *   npm run db:migrate-site-layout                       # 真正执行
 *   npm run db:migrate-site-layout -- --out report.json  # 同时把报告写到文件
 *
 * 前提：先执行 `npm run db:migrate`（建好 portal_site_layout / portal_page_schema_backup 两张表）。
 * 可以放心重复执行：幂等，第二次起不会再改任何数据。规则与注意事项见
 * `src/features/portal-content/portal-content.site-layout-migration.service.ts`。
 */
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { migrateSiteLayoutService } from "../src/features/portal-content/portal-content.site-layout-migration.service";

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", default: false },
      out: { type: "string" },
    },
  });
  const dryRun = Boolean(values["dry-run"]);

  const report = await migrateSiteLayoutService({ dryRun });
  const json = JSON.stringify(report, null, 2);
  if (values.out) writeFileSync(values.out, `${json}\n`, "utf8");

  const { layout, migratedPages, conflicts, flatPages, invalidPages } = report;
  console.log(`[migrate-site-layout] ${dryRun ? "演练（未写入任何数据）" : "已执行"}`);
  console.log(
    `  页面 ${report.totalPages} 个：抽取 ${migratedPages.length}、冲突 ${new Set(conflicts.map((c) => c.id)).size}、扁平 ${flatPages.length}、无法解析 ${invalidPages.length}、无需处理 ${report.cleanPages}`,
  );
  console.log(
    `  公共布局：${layout.existed ? "已存在（未覆盖）" : layout.created ? "新建" : "无内容可抽取，未创建"}，页头 ${layout.headerNodes} 个节点、页脚 ${layout.footerNodes} 个节点`,
  );
  if (!dryRun)
    console.log(`  新写入备份 ${report.backupsCreated} 份（表 portal_page_schema_backup）`);
  if (conflicts.length > 0) {
    console.log("  冲突（页面自带的内容已原样保留，请人工确认）：");
    for (const item of conflicts) {
      console.log(`    - ${item.path}（${item.title}）${item.part}/${item.schema}：${item.reason}`);
    }
  }
  if (!values.out) console.log(`\n${json}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[migrate-site-layout] 失败：", error);
    process.exit(1);
  });
