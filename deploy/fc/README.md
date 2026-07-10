# FC 部署入口
#
# deploy/fc 是 FC3 部署的唯一入口；之前有没有根目录 s.yaml 都一律作废。
#
# **CI/CD 流程**（OIDC + 临时 STS）见 [../docs/deploy-oidc.md](../docs/deploy-oidc.md)。
# 本 README 只讲 FC3 函数产物层 + 数据库约定。
#
# 目录约定：
#   s.yaml                 FC3 函数配置（app + 域名）
#   s.migrator.yaml        仅 migrator 函数的 FC3 配置（无 trigger / 无域名）
#   server/bootstrap       app 启动脚本模板
#   server/migrator-bootstrap  migrator 启动脚本模板
#   code/                  app 上传目录（scripts/build-fc.mjs 写入）
#   code-migrator/         migrator 上传目录（含 esbuild bundle 的 migrate.mjs + db/migrations/）
#   .env.example           环境变量示例（真实值写到 prod.env，不提交）

# 上传目录由 build-fc 生成，包含 .output/server/index.mjs、assets、public、package.json（**不带** node_modules，依赖通过 nitro rollup 内联到 _libs/）。
#
# 数据库约定：
#   - 线上 FC 通过 vpcConfig 进入内网，使用 DATABASE_HOST 私网地址。
#   - 一个应用一个库一个用户，默认库名 yishan_tan，默认用户 yishan_tan_app。
#   - CI/FC 使用 DATABASE_USER/PASSWORD/NAME/HOST/PORT 拆分变量；本地仍可使用 DATABASE_URL。
#   - 首次/后续迁移由 yishan-tan-migrator 函数承担（详见 MIGRATOR.md）。
