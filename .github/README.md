# GitHub Actions 配置（一次性）

> **完整 OIDC 联邦 + Aliyun RAM 规范 → [docs/deploy-oidc.md](../docs/deploy-oidc.md)**
>
> 本 README 只列**最速上手的两步清单**。新仓库接入前请先读规范 doc。

仓库 `daifuyang/yishan-tan` 走 **OIDC 联邦 + Aliyun RAM 临时 STS**，不用长期密钥。~10 分钟。

---

## Step 1. 阿里云 RAM 一次性配置

完整步骤（含 IdP / Policy / Role / 信任策略 / 多 repo 复用）+ 故障速查表 → [docs/deploy-oidc.md §3](../docs/deploy-oidc.md#3-阿里云-ram-端-6-步一次性配置)。

要点速查（命名已统一）：

- OIDC IdP：**`github-actions`**（账号级共享，仅一份）
- Custom Policy：**`fc-deployer`**（账号级共享，跨 repo 可复用）
- RAM Role：每个 repo 一条，pattern 是 **`<repo>-deployer`**（如 `yishan-tan-deployer`）
- 信任策略 `oidc:aud = aliyun-fc-<repo>`，`oidc:sub` 限定到自己的 `repo:owner/name`

## Step 2. GitHub Secrets（每个 repo 2 条）

| Name | 内容 |
| --- | --- |
| `FC_DEPLOY_ROLE_ARN` | Step 1 最后输出的 `acs:ram::<account>:role/<repo>-deployer` |
| `PROD_ENV_FILE` | 本地 `deploy/fc/prod.env` 整文件原文（多行） |

设置方法：

```bash
ROLE_ARN="acs:ram::1650595695532785:role/yishan-tan-deployer"
gh secret set FC_DEPLOY_ROLE_ARN --repo daifuyang/yishan-tan --body "$ROLE_ARN"
gh secret set PROD_ENV_FILE --repo daifuyang/yishan-tan < deploy/fc/prod.env
```

## Step 3. 仓库侧 workflow 权限（YAML）

```yaml
permissions:
  contents: read
  id-token: write   # 必须：用于 OIDC token 颁发
```

## 验证（5 分钟）

```bash
git push origin main
# → GitHub Actions → AssumeRoleWithOIDC → STS → s deploy → tan.zerocmf.com
curl https://tan.zerocmf.com/api/health
# → {"ok":true,"service":"yishan-tan","time":"..."}
```

## 排错

详细故障速查表 + 错误码 → [docs/deploy-oidc.md §6](../docs/deploy-oidc.md#6-故障速查表)。