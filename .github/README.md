# GitHub Actions 配置（一次性）

仓库 `daifuyang/yishan-tan` 走 OIDC 联邦 + Aliyun RAM 临时 STS，不用长期密钥。
**总配置时间约 10–15 分钟，分两步：阿里云 RAM 控台一次，GitHub repo secrets 一次。**

---

## 1. 阿里云 RAM 控制台（5 分钟）

### 1.1 创建 OIDC 身份提供方（IdP）

| 字段 | 值 |
|---|---|
| 类型 | OIDC |
| 提供方名称 | `github-actions-yishan-tan` |
| Issuer URL | `https://token.actions.githubusercontent.com` |
| 颁发者 URL | (同 Issuer URL) |
| 客户端 ID | （填 audience，跟 trust policy 里 `oidc:aud` 对应：`aliyun-fc-yishan-tan`） |
| 备注 | yishan-tan 的 GitHub Actions OIDC 联邦 |

> 创建后记录 **OIDCProviderArn**（形如 `acs:ram::1650595695532785:oidc-provider/github-actions-yishan-tan`），
> 下一步建 role 会用到。

### 1.2 创建 RAM role `github-actions-yishan-tan-deploy`

身份类型：**OIDC**（选择 1.1 建的 IdP）。

信任策略（粘到"高级 → 信任策略管理"）：

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": [
          "acs:ram::1650595695532785:oidc-provider/github-actions-yishan-tan"
        ]
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "oidc:aud": "aliyun-fc-yishan-tan"
        },
        "StringLike": {
          "oidc:sub": [
            "repo:daifuyang/yishan-tan:ref:refs/heads/main",
            "repo:daifuyang/yishan-tan:ref:refs/tags/*"
          ]
        }
      }
    }
  ],
  "Version": "1"
}
```

可信范围：`main` 分支 + 任意 tag push。

**SessionDuration** 调到 `3600`（秒 = 1 小时，给 build+deploy 留充足时间，CI job 超 1 小时会失败）。

### 1.3 创建权限策略 `fc-deploy-yishan-tan`

新建自定义策略，粘贴：

```json
{
  "Version": "1",
  "Statement": [
    {
      "Sid": "FC3FullAccessInCnShanghai",
      "Effect": "Allow",
      "Action": [
        "fc:Create*",
        "fc:Update*",
        "fc:Get*",
        "fc:List*",
        "fc:Describe*",
        "fc:Invoke*",
        "fc:Delete*"
      ],
      "Resource": "acs:fc:cn-shanghai:1650595695532785:*"
    },
    {
      "Sid": "VPCReadOnly",
      "Effect": "Allow",
      "Action": [
        "vpc:DescribeVpc",
        "vpc:DescribeVSwitches",
        "vpc:DescribeSecurityGroup"
      ],
      "Resource": "*"
    }
  ]
}
```

资源范围限定到 `cn-shanghai` + 你的账号 ID，最小权限需要时再加。

把这条策略**附给** 1.2 建的 role。

### 1.4 拿 RoleArn

创建成功后 RAM 会显示：

```
acs:ram::1650595695532785:role/github-actions-yishan-tan-deploy
```

**这就是要填进 GitHub Secret `FC_DEPLOY_ROLE_ARN` 的值。**

### 1.5 （可选，可后做）暴露必要变量

FC3 在 deploy 时可能会调用 `GetDomain` / `DescribeFunction` 等，需要 RAM 角色有相关权限。上面策略已经包含 `fc:Get*`、`fc:List*` —— 应该够。如果 `s plan` 跑出权限错误，把错误信息贴给我，加白名单项。

---

## 2. GitHub repo secrets/vars（5 分钟）

**路径**：`https://github.com/daifuyang/yishan-tan/settings/secrets/actions`

### 2.1 新增 Secret

| Name | 怎么填 |
|---|---|
| `FC_DEPLOY_ROLE_ARN` | 第 1.4 步拿到的 role ARN |
| `PROD_ENV_FILE` | 本地 `deploy/fc/prod.env` 整文件原文（多行，GitHub 自动保留）。**注意**：包含 `BETTER_AUTH_SECRET` / `DATABASE_PASSWORD` / `REDIS_URL` 等敏感项，**只能**给 `Actions` / `Production` 之类的最小环境用。 |

### 2.2 新增 Variable（可选）

Variables 在 PR 触发时也对 workflow 可见；Secrets 同样。这里没有需要的。

### 2.3 （可选）加 production Environment + required reviewers

如果某天想加审批：
1. Settings → Environments → New environment → `production`
2. "Required reviewers" 加 `daifuyang`
3. **不**加 "Wait timer"
4. 在 workflow `deploy-prod` 步骤上加 `environment: production`

GitHub 会先卡住 job 等你点 Approve 再继续。

---

## 3. 验证（5 分钟）

### 3.1 只跑 ci：

```bash
git push origin <tmp-branch>
# 触发 ci.yml，跑 check（无云权限，~2 分钟）
```

### 3.2 跑完整 deploy：

```bash
git push origin main
# 触发 ci + deploy-prod（OIDC → STS → s deploy 全链）
```

### 3.3 手动跑：

GitHub UI → Actions → deploy → Run workflow → 选 `skip_migrate=0`（默认）。

---

## 4. 排错速查

| 错误现象 | 大概率原因 |
|---|---|
| `AssumeRoleWithOIDC: InvalidParameter.RoleArn` | `role-arn` secret 没填 / 填错；确认 RAM 控制台能看到这条 role |
| `AssumeRoleWithOIDC: AccessDenied` | trust policy 里 `oidc:sub` 没匹配当前 ref / `oidc:aud` 没匹配 audience |
| `AssumeRoleWithOIDC: ... Not authorized to perform sts:AssumeRoleWithOIDC` | 没勾选「OIDC 类型身份提供方」或 IdP 绑定错了 |
| `User: <sts-ak> is not authorized to perform fc:Get*` | 权限策略没附；或资源范围写错 |
| `s deploy` 跑得通但 `s cli fc3 invoke` 报 412 | 这是 FC custom runtime 特性，靠日志里的 `[db-migrate] OK` 判定，**不是**真的错误 |
| workflow_file 404 | `workflow_call` 没声明，可复用 workflow 必须有 |
| Akamai \| `error: User data is empty` | workflow_dispatch 没传 input 但引用了 `inputs.foo` |
