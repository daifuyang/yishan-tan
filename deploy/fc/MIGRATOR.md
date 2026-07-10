# FC3 迁移函数（yishan-tan-migrator）

> 跟 `README.md`、`OWN.md` 同级；只描述 migrator 的目的、用法、配置。

## 为什么需要

`bootstrap` 启动器必须保持纯启动（OWN.md 约束「禁止执行 apt / pnpm install / db migration / 证书续签」），
**但 prod DB 需要在 app 开始接受流量前就有一致 schema + 至少一个 admin 账号**。

折中方案：另起一个**单用途 FC3 函数** `yishan-tan-migrator`，跟 app 共享 VPC、Redis、DB 凭据，
但**不承担流量**——只在 invoke 时跑一次 `drizzle-kit migrate` 等价的代码 + 首次 admin seed。

调用方式 `s cli fc3 invoke`（sync 走 FC API），**无需自定义域名**——函数冷启动后跑完就结束，
路由把「funciton exited 0」视为 412（custom runtime 特性），我们靠日志里的 `[db-migrate] OK`
marker 来判定真成功，详见 `scripts/migrate-invoke.sh`。

## 包结构

```text
deploy/fc/
  s.yaml                ← app 函数 + tan.zerocmf.com 域名（原样）
  s.migrator.yaml       ← 仅 yishan-tan-migrator 函数，无 trigger 无域名
  server/
    bootstrap           ← app 启动器（不跑迁移）
    migrator-bootstrap  ← migrator 启动器（直接 node /code/migrate.mjs）
  code/                 ← app 部署包（npm run build:fc 生成）
  code-migrator/        ← migrator 部署包
    migrate.mjs         ← esbuild bundle of scripts/db-migrate.ts（~257KB）
    db/migrations/      ← Drizzle 生成的 SQL + meta/_journal.json
    bootstrap
    package.json
```

migrator 包大小约 **352K**（无 node_modules），esbuild 把 drizzle-orm、postgres-js、
`@better-auth/utils/password`（scrypt 哈希，与 better-auth 兼容）打成一个 mjs。

## 部署顺序

```bash
# 单条命令搞完 build + deploy：
npm run deploy
# 等价于：
#   build  -> build:fc -> s deploy migrator -> invoke migrator -> s deploy app+domain -> smoke

# 仅迁移（不动 app 代码）：
npm run deploy:migrate
# 或：
bash scripts/migrate-invoke.sh
```

`apply` 内部顺序详解：

1. `npm run build` —— Nitro 构建 app 产物到 `.output/`
2. `npm run build:fc` —— 把 `.output/` 装到 `code/`；把 `db-migrate.ts` esbuild bundle + `db/migrations/` 装到 `code-migrator/`
3. `s deploy --template s.migrator.yaml` —— 上传/更新 migrator 函数（首次会创建）
4. `bash scripts/migrate-invoke.sh` —— sync invoke，幂等地跑 `drizzle migrate` + 首次 admin seed
5. `s deploy` —— 上传/更新 app 函数 + 域名绑定（首次会创建）
6. `curl ${SMOKE_URL}/api/health` —— 冒烟

幂等性：每次 `npm run deploy` 都会跑 step 4。重跑对**已应用过的 migrations** 是空跑；对**已存在的 user** 跳过 seed。

## 跳过迁移

CI 在做回滚之类的紧急操作时不需要跑迁移：

```bash
YISHAN_SKIP_MIGRATE=1 npm run deploy
```

会跳过 step 4，但仍然 deploy app——意味着代码会跑在旧 schema 上；这是预期的回滚用法。

## 配置覆盖

migrator 函数读下列 env，由 `deploy/fc/s.migrator.yaml` 的 `environmentVariables` 注入：

| env | 默认值 | 说明 |
| --- | --- | --- |
| `MIGRATIONS_FOLDER` | `/code/db/migrations` | migrations 目录 |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | 首次 admin email |
| `SEED_ADMIN_USERNAME` | `admin` | 首次 admin 用户名 |
| `SEED_ADMIN_PASSWORD` | `admin123` | 首次 admin 密码 |
| `SEED_ADMIN_DISPLAY_NAME` | `超级管理员` | 显示名 |

> 这几个 SEED_ADMIN_* 在 `s.migrator.yaml` 中**没有**列在 `environmentVariables`，因为 `s` 渲染器对空值会抛错；
> 用 `migrate.mjs` 代码内的默认值。如果需要覆盖，往 `deploy/fc/prod.env` 加，并在
> `deploy/fc/s.migrator.yaml` 把对应 `${env(...)}` 行补上。

首次 seed 后，admin 用户密码请尽快通过 UI 改掉。

## 不在 migrator 范围的事

- **业务种子数据**（菜单/字典/部门/岗位树等）—— 仍走 `npm run db:seed`（本地 TSX 跑 against prod DB）。
  何时跑：上线前或大批量 schema 演进时。
- **回滚迁移**——Drizzle 默认 forward-only。如果必须回滚，手工在数据库侧 `DROP COLUMN` 等。
