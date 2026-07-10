# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **OIDC 联邦 + Aliyun RAM 临时 STS**（替代静态 AccessKey 落 GH Secrets）。
  - `.github/actions/fc-deploy-env/action.yml`：composite action。请求 GH OIDC token
    → `aliyun sts AssumeRoleWithOIDC` → 写 `~/.s/access.yaml` 的 `default` profile
    （含 SecurityToken），s CLI 直接走 STS 调用 FC3。1h TTL，工作流结束即焚。
  - `.github/workflows/ci.yml`：`typecheck + lint + test + arch:check` 轻量校验。
  - `.github/workflows/deploy.yml`：main push 触发，跑完整 `npm run deploy`
    （`check` job 复用 ci.yml + `deploy-prod` job 走 OIDC）。
- **数据库迁移函数 `yishan-tan-migrator`**（独立 FC3 函数，无 trigger 无域名）。
  - `scripts/db-migrate.ts`：用 drizzle 的 `migrate` 同行 API；`users` 表为空时跑首次 seed
    （admin user + admin role + 绑定，scrypt 哈希与 better-auth 兼容）。
  - `scripts/build-fc.mjs`：把 `db-migrate.ts` 用 esbuild bundle 成
    `deploy/fc/code-migrator/migrate.mjs`（~257KB，无 node_modules）。
  - `deploy/fc/server/migrator-bootstrap` + `deploy/fc/s.migrator.yaml`：自定义 runtime 入口。
  - `scripts/migrate-invoke.sh` + `deploy/fc/MIGRATOR.md`：封装 `s cli fc3 invoke`，
    sync 调用、靠日志里的 `[db-migrate] OK` marker 兜底判定成功。
- **证书自动续签**：
  - `scripts/cert-renew.sh`：本地跑 ACME DNS-01（`aic cert:issue -d aliyun`）
    → CAS 上传（`aic aliyun-cert:upload -p enterprise`），cert 名字固定
    `yishan-tan-cert`，阈值 30 天未过期则跳过。
  - 装上 crontab：每周日 03:00 跑 `scripts/cert-renew.sh`，输出到
    `/home/dfy/.logs/cert-renew.log`。
- **规范文档**：`docs/deploy-oidc.md`（命名约定 + 6 步 checklist + 多 repo 复用 +
  故障速查表 + cutover 流程）。

### Changed

- **构建输出切到 Nitro 模式**：`vite.config.ts` 加 `nitro()` 插件 + `ssr.noExternal`，
  `npm run build` 产出 `.output/server/index.mjs`（所有依赖 rollup inline 到
  `_libs/`），不再带 node_modules。App 包 6.6M、migrator 包 0.35M。
- **`scripts/build-fc.mjs`**：拆分为 `buildAppPackage` + `buildMigratorPackage`，
  按需求复制 `deploy/fc/code/` + `deploy/fc/code-migrator/`。
- **FC3 custom runtime 启动器简化**：
  - `deploy/fc/server/bootstrap` 简化回 `exec node .output/server/index.mjs`
  - `deploy/fc/s.yaml` `environmentVariables.PATH` 显式置为
    `/var/fc/lang/nodejs22/bin:...`（FC3 自带 node-22，bootstrap 不再硬编码 .output）。
- **GitHub Actions OIDC 命名统一化**（多 repo 可复用 + 账号级 vs per-repo 清晰分层）：
  | 资源 | 旧 | 新 | 作用域 |
  | --- | --- | --- | --- |
  | OIDC IdP | `github-actions-yishan-tan` | **`github-actions`** | 阿里云账号级共享 |
  | RAM Role | `github-actions-yishan-tan-deploy` | **`yishan-tan-deployer`** | 每 repo 一条 |
  | Custom Policy | `fc-deploy-yishan-tan` | **`fc-deployer`** | 账号级共享 |
  | s CLI profile | `enterprise` | **`default`** | s CLI / aic CLI 各自 namespace |
  | `~/.s/access.yaml` profile 名 | `enterprise` | **`default`** | 5 处统一 |
- **GH Secret `FC_DEPLOY_ROLE_ARN`** 切换到新 RoleArn：
  `acs:ram::1650595695532785:role/yishan-tan-deployer`。
- **文档反向引用** 4 处：`OWN.md` 部署约定、`CLAUDE.md` 部署节、
  `deploy/fc/README.md` 开头、`docs/README.md` 索引表。

### Removed

- **Aliyun RAM 旧资源**（切换后清掉）：
  - OIDC IdP `github-actions-yishan-tan`
  - RAM Role `github-actions-yishan-tan-deploy`
  - Custom Policy `fc-deploy-yishan-tan`
- **deploy/fc/certs** 原本放在仓库里（FC certConfig 三件套强制要求），
  暂未删除（90 天 cert 续签通道落地前不能动；见下方 [Unreleased] 后续项）。

### Deprecated

- `.github/README.md`（旧 178 行 OIDC 配置指引）：保留，但重写为只指
  `docs/deploy-oidc.md`；新仓库接入直接读规范 doc。

### Fixed

- `scripts/deploy-fc.sh` 的 `SMOKE_URL` 在 `source prod.env` 之前求值 → 挪到 source 之后。
- `scripts/db-migrate.ts` 的 `ON CONFLICT (name)` 在 `role.name` 非 unique 时报错 → 改为
  select-then-insert 显式判存。
- `scripts/db-migrate.ts` 没有 `process.exit(0)`，postgres-js 残留 socket 让 FC 报
  `CAExited 412` → 末尾显式 `process.exit(0)`。
- `biome.json` 漏掉 `deploy/fc/code-migrator/`（esbuild 产物会被误扫）→ 加进去。
- `deploy/fc/code-migrator/` 被误 add 进 git 索引 → `git rm --cached`，移出仓库。
- `npm run format` 自动修复了 `scripts/build-fc.mjs` + `scripts/db-migrate.ts` 的行长超 100。
- `npx biome check --write` 修了 `scripts/build-fc.mjs` 的 import alphabetic 排序。
- `.github/actions/fc-deploy-env/action.yml` 输入描述里直接出现 `${{ secrets.* }}` 文本被
  GH 模板解析器误识别为表达式 → 改成不带表达式的描述。
- composite action step 不能直接读 `secrets` context → 改用 `inputs.prod-env-file`
  由 workflow 用 `${{ secrets.PROD_ENV_FILE }}` 喂进去。
- `aliyun sts AssumeRoleWithOIDC` 缺 `--OIDCProviderArn`（虽然 aliyun 帮助页标 optional 但实际必填）→ 加进去。
- assume role 响应字段叫 `AccessKeyId` 不是 `SessionAccessKeyId` → 修正 jq 路径。
- `scripts/cert-renew.sh` `set -euo pipefail` 下引用未声明变量 `RENEW_THRESHOLD` → 改为
  `RENEW_THRESHOLD_DAYS`。

### Security

- **CI 零长期密钥**：GH Secrets 只剩 `FC_DEPLOY_ROLE_ARN` + `PROD_ENV_FILE`，
  没有 AccessKey。STS 1h TTL 自动失效，工作流结束即焚。
- **账号级 RAM admin 权限回收**：原 `user/dns` 上的 `AliyunRAMFullAccess`（`*:*` 全开）
  已 detach。后续手动 cutover 时临时挂上、用完即拆。详见 `docs/deploy-oidc.md §7`。
- **local `s deploy` 走 default profile**：原来 `~/.s/access.yaml` 里
  `default / default-1 / enterprise` 三个 profile 都是同一对长 AK，命名统一为 `default` 后
  行为 0 差异（同一对 AK），但消除了三个 alias 共存的歧义。

---

## 待办 / 后续

- **证书自动下载 / 跨账号 CAS read perm**：未来把 `deploy/fc/certs/` 移出仓库前，
  需要给 `user/dns` 加 `yundun-cert:GetUserCertificateDetail`（从 CAS 拉 cert 到本地），
  当前拉不到（403）。Cron 路径下短期不影响（cert 还在本地）。
- **GH Actions 周期性 cert renewal workflow**（备选）：如果 local crontab 不够可靠，
  走 GH Actions schedule + personal AK secrets + 给 OIDC role 加 `cas:UploadUserCertificate`。
- **多 repo OIDC 拓展**：`yishan-flow` / `docbase` 复用同一 IdP `github-actions` +
  Policy `fc-deployer`，仅需新建 `yishan-flow-deployer` /
  `docbase-deployer` role。详见 `docs/deploy-oidc.md §5`。

## 版本与历史

- 本项目目前 **0.1.0**（`package.json`），处于企业内部基座阶段，未发布到公共 registry。
- 本 CHANGELOG 仅记录未发布的迭代（Unreleased）；首个发版时会切到带版本号的格式。