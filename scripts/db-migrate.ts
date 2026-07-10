/**
 * 数据库迁移 + 首次 admin seed（仅针对 prod/FC 部署路径）。
 *
 * 设计：
 * - 必须幂等：可重复调用，第二次起 schema 一致、users 非空，所有写入 no-op。
 * - 通过 esbuild bundle 为 ~256KB 的 migrate.mjs，与 db/migrations/ 一起打成 FC 代码包，
 *   由 deploy/fc/server/migrator-bootstrap 启动后调用一次 `s fc3 invoke`。
 * - 用户业务数据（菜单、字典、部门树等）仍由 `npm run db:seed` 全量跑，迁移函数只保证
 *   "线上拿到 admin 能登录并看到空控制台" 的最小落地。具体来说：
 *     * 创建 admin role（如缺失）
 *     * 创建 admin 用户（如整表为空），密码用 better-auth 的 scrypt 格式哈希
 *     * 绑定 user_role
 *
 * 不依赖 Drizzle schema 对象，使用 raw SQL，避免把整个业务 schema 拉进 bundle。
 */
import { hashPassword } from "@better-auth/utils/password";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { getDatabaseUrl } from "../src/lib/database-url";

type CliValues = {
  adminEmail: string;
  adminUsername: string;
  adminPassword: string;
  adminDisplayName: string;
  migrationsFolder: string;
  dryRun: boolean;
};

function parseEnv(env: NodeJS.ProcessEnv): CliValues {
  return {
    adminEmail: env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    adminUsername: env.SEED_ADMIN_USERNAME ?? "admin",
    adminPassword: env.SEED_ADMIN_PASSWORD ?? "admin123",
    adminDisplayName: env.SEED_ADMIN_DISPLAY_NAME ?? "超级管理员",
    migrationsFolder: env.MIGRATIONS_FOLDER ?? "/code/db/migrations",
    dryRun: env.DRY_RUN === "1",
  };
}

async function firstTimeSeed(
  client: ReturnType<typeof postgres>,
  input: CliValues,
): Promise<{ created: boolean; userId?: string; roleId?: string }> {
  const existing = await client<{ count: number }[]>`
    SELECT count(*)::int AS count FROM "user" WHERE deleted_at IS NULL
  `;
  const userCount = existing[0]?.count ?? 0;

  if (userCount > 0) {
    console.log(
      `[db-migrate] users table not empty (count=${userCount}), skipping first-time admin seed`,
    );
    return { created: false };
  }

  console.log(
    `[db-migrate] users table empty -> bootstrapping default admin (${input.adminUsername} <${input.adminEmail}>)`,
  );

  const passwordHash = await hashPassword(input.adminPassword);

  // 1) Admin role. role.name is NOT unique in this schema -> manual existence check.
  const existingRole = await client<{ id: string }[]>`
    SELECT id FROM "role" WHERE name = ${"超级管理员"} LIMIT 1
  `;
  let roleId = existingRole[0]?.id;
  if (!roleId) {
    const inserted = await client<{ id: string }[]>`
      INSERT INTO "role" (name, description, status, data_scope, is_system_default)
      VALUES (${"超级管理员"}, ${"拥有系统最高权限"}, ${"enabled"}, ${"1"}, ${true})
      RETURNING id
    `;
    roleId = inserted[0]?.id;
    if (!roleId) throw new Error("failed to insert admin role");
  }

  // 2) Admin user. user.email IS unique (-> ON CONFLICT (email) is safe).
  const existingUser = await client<{ id: string; role: string }[]>`
    SELECT id, role FROM "user" WHERE email = ${input.adminEmail} LIMIT 1
  `;
  let userId = existingUser[0]?.id;
  if (!userId) {
    const inserted = await client<{ id: string }[]>`
      INSERT INTO "user" (email, email_verified, name, username, display_name, role)
      VALUES (
        ${input.adminEmail},
        ${true},
        ${input.adminUsername},
        ${input.adminUsername},
        ${input.adminDisplayName},
        ${"admin"}
      )
      RETURNING id
    `;
    userId = inserted[0]?.id;
    if (!userId) throw new Error("failed to insert admin user");
  } else {
    // already exists -> make sure role=admin
    await client`UPDATE "user" SET role = ${"admin"} WHERE id = ${userId}`;
  }

  // 3) Better-auth credential account. check by (provider_id, account_id) since user has
  //    no unique on those columns either -> select-then-insert.
  const existingAccount = await client<{ id: string }[]>`
    SELECT id FROM "account"
    WHERE "provider_id" = ${"credential"} AND "account_id" = ${userId}
    LIMIT 1
  `;
  if (!existingAccount[0]) {
    await client`
      INSERT INTO "account" (
        "user_id", "account_id", "provider_id", "password",
        "created_at", "updated_at"
      )
      VALUES (
        ${userId}, ${userId}, ${"credential"}, ${passwordHash},
        NOW(), NOW()
      )
    `;
  } else {
    await client`
      UPDATE "account"
      SET "password" = ${passwordHash}, "updated_at" = NOW()
      WHERE "provider_id" = ${"credential"} AND "account_id" = ${userId}
    `;
  }

  // 4) Bind user -> admin role. user_role has PK (user_id, role_id) -> ON CONFLICT DO NOTHING.
  await client`
    INSERT INTO "user_role" ("user_id", "role_id", "created_at")
    VALUES (${userId}, ${roleId}, NOW())
    ON CONFLICT DO NOTHING
  `;

  return { created: true, userId, roleId };
}

async function main(): Promise<void> {
  const input = parseEnv(process.env);
  const url = getDatabaseUrl(process.env);
  if (!url) {
    console.error("[db-migrate] DATABASE_URL (or split DATABASE_USER/PASSWORD/HOST/NAME) is not configured");
    process.exit(2);
  }

  console.log(`[db-migrate] target migrations folder: ${input.migrationsFolder}`);
  console.log(`[db-migrate] target db host: ${new URL(url).host}`);

  if (input.dryRun) {
    console.log("[db-migrate] DRY_RUN=1 — connecting only, no migrations will be applied");
    const probe = postgres(url, { max: 1 });
    await probe`SELECT 1`;
    await probe.end();
    console.log("[db-migrate] connection probe OK");
    return;
  }

  const client = postgres(url, { max: 1, idle_timeout: 5 });
  const db = drizzle(client);

  console.log("[db-migrate] applying pending drizzle migrations");
  await migrate(db, { migrationsFolder: input.migrationsFolder });
  console.log("[db-migrate] migrations applied");

  const result = await firstTimeSeed(client, input);

  await client.end();
  await new Promise((r) => setImmediate(r));

  if (result.created) {
    console.log("");
    console.log("✔ bootstrap admin 已就绪");
    console.log("─────────────────────────────────────");
    console.log(`  user id   : ${result.userId}`);
    console.log(`  role id   : ${result.roleId}`);
    console.log(`  username  : ${input.adminUsername}`);
    console.log(`  email     : ${input.adminEmail}`);
    console.log(`  password  : ${input.adminPassword}`);
    console.log("─────────────────────────────────────");
    console.log("提示：登录后请尽快修改默认密码并完善 SITE config。");
  } else {
    console.log("[db-migrate] no first-time seed performed");
  }

  console.log("[db-migrate] OK");
  // Force exit with status 0 — postgres-js may keep the event loop alive otherwise,
  // which makes FC report CAExited 412 even though the work itself completed.
  process.exit(0);
}

main().catch((err) => {
  console.error("[db-migrate] FAILED:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});
