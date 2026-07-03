# FC 部署入口
#
# fc-deploy 是 FC3 部署的唯一入口；之前有没有根目录 s.yaml 都一律作废。
#
# 目录约定：
#   s.yaml                 FC3 函数配置
#   server/bootstrap       custom runtime 启动脚本模板
#   code/                  构建生成的上传目录（scripts/build-fc.mjs 写入）
#   .env.example           环境变量示例（真实值写到 prod.env，不提交）

# 上传目录由 build-fc 生成，包含 .output/server/index.mjs、assets、public、package.json + node_modules。
