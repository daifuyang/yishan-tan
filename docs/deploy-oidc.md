# Deploy: OIDC 联邦 + Aliyun RAM

> yishan-tan 的「零长期密钥」CI/CD 规范。
> 适用对象：在这台阿里云账号（`1650595695532785`）下做 FC3 部署的仓库。
> 当前实例：`daifuyang/yishan-tan`；同一套命名可直接套到 `daifuyang/yishan-flow`、`daifuyang/docbase` 等。

## 1. 总览

```
GitHub Actions runner (ubuntu-latest)
  ├─ ① GitHub OIDC JWT  (aud=aliyun-fc-yishan-tan, sub=repo:<owner>/<repo>:ref:...)
  ├─ ② aliyun sts AssumeRoleWithOIDC
  │       ↳ 账号 1650595695532785, region cn-hangzhou
  │       ↳ Federated IdP: github-actions  (账号级共享)
  │       ↳ Role:        <repo>-deployer  (每 repo 一条)
  │       ↳ 返回 STS.AccessKeyId + Secret + SecurityToken, 1h TTL
  ├─ ③ 写 ~/.s/access.yaml 的 default profile (含 SecurityToken)
  └─ ④ s deploy / s cli fc3 invoke 走 default profile → 调 FC3 函数

FC3 函数 (cn-shanghai)
  └─ 通过 VPCConfig 直连 RDS / Redis
```

无静态 AccessKey 落 GH Secrets。STS 1 小时自动失效，工作流结束即焚。

## 2. 命名规范

### 2.1 账号级（一个 aliyun 账号**只能各有一份**）

| 资源 | 命名 pattern | 当前实例 | 备注 |
| --- | --- | --- | --- |
| OIDC IdP | `github-actions` | `acs:ram::1650595695532785:oidc-provider/github-actions` | **强约束**：一个 aliyun 账号对同一 OIDC issuer URL 只能有一个 IdP。若换名（如 `github-actions-yishan-tan`）必须先删后建，删时所有引用此 IdP 的 RAM role 信任策略会失效。 |
| 自定义 Policy | `fc-deployer` | `acs:ram::1650595695532785:policy/fc-deployer` | 跨 repo 复用。资源范围 `acs:fc:cn-shanghai:1650595695532785:*` + `vpc:Describe*` 只读。 |
| STS endpoint region | `cn-hangzhou` | — | STS API 所在 region，不是 FC 部署 region。 |

### 2.2 每 repo（每个有 CI/CD 部署需求的 repo 一份）

| 资源 | 命名 pattern | 当前实例 |
| --- | --- | --- |
| RAM Role | `<repo>-deployer` | `acs:ram::1650595695532785:role/yishan-tan-deployer` |
| OIDC audience (ClientId) | `aliyun-fc-<repo>` | `aliyun-fc-yishan-tan`（**不可带下划线**——CF IdP ClientIds 不支持） |
| `oidc:sub` filter | `repo:<owner>/<repo>:ref:refs/heads/main` + `:refs/tags/*` | `repo:daifuyang/yishan-tan:...` |
| GitHub Secret name | `FC_DEPLOY_ROLE_ARN` | — |
| GitHub Secret name（多 secret 时） | `PROD_ENV_FILE` | — |
| 资源名称（文件 / 模块 / 函数） | 与仓库 `name` 字段一致 | `yishan-tan`（app）、`yishan-tan-migrator` |

### 2.3 s CLI / aic CLI profile 名

| CLI | profile 配置文件 | 默认 profile 名 | 备注 |
| --- | --- | --- | --- |
| `s` | `~/.s/access.yaml` | **`default`** | 本仓 `deploy/fc/s.yaml` / `s.migrator.yaml` 都 `access: "default"`；CI 通过 composite action 写 STS 到该 profile。本地长 AK 也可塞同一 profile。 |
| `aliyun` | `~/.aliyun/config.json` | `default`（或别的） | 与 `s` **完全独立的 namespace**。 |
| `aic` | `~/.aliyun/config.json`（共享 aliyun CLI） | 按需 | OIDC 流程**不涉及** aic CLI。cert 续签是单独链路。 |

`enterprise` 这个名字曾被用作 `s` CLI profile（本地 `/home/dfy/.s/access.yaml` 还有这个名字），**只是历史命名**——CI deploy 改用 `default`，行为 0 差异（profile 切换不影响 STS 验证）。

## 3. 阿里云 RAM 端：6 步一次性配置

**前置**：账号 `1650595695532785` 下有一个 RAM 用户有 `AliyunRAMFullAccess`（用 `aliyun ram` CLI 操作）。

> ⚠️ **硬约束**：阿里云 OIDC IdP 按 issuer URL 唯一化。一个 aliyun 账号下、同一 `https://token.actions.githubusercontent.com` 只能有一个 IdP。改名必须删后建。

```bash
# 准备固定值
ACCOUNT=1650595695532785
ISSUER="https://token.actions.githubusercontent.com"
AUDIENCE="aliyun-fc-yishan-tan"
REPO="yishan-tan"
GITHUB_OWNER="daifuyang"
FP=$(openssl s_client -connect token.actions.githubusercontent.com:443 \
    -servername token.actions.githubusercontent.com </dev/null 2>/dev/null \
    | openssl x509 -noout -fingerprint -sha256 | sed 's/^sha256 Fingerprint=//;s/://g')
echo "fingerprint=$FP"

aliyun ims CreateOIDCProvider \
  --OIDCProviderName "github-actions" \
  --IssuerUrl "$ISSUER" \
  --ClientIds "$AUDIENCE" \
  --Fingerprints "$FP" \
  --Description "GitHub Actions OIDC federation (account-wide)" \
  --IssuanceLimitTime 24 \
  --profile <your-admin-profile>

# 2) 创建 fc-deployer 策略（账号级共享）
cat > /tmp/fc-deployer.json <<'EOF'
{
  "Version": "1",
  "Statement": [
    { "Sid": "FC3ScopedCnShanghai", "Effect": "Allow",
      "Action": ["fc:Create*","fc:Update*","fc:Get*","fc:List*",
                 "fc:Describe*","fc:Invoke*","fc:Delete*"],
      "Resource": "acs:fc:cn-shanghai:1650595695532785:*" },
    { "Sid": "VPCReadOnly", "Effect": "Allow",
      "Action": ["vpc:DescribeVpc","vpc:DescribeVSwitches","vpc:DescribeSecurityGroup"],
      "Resource": "*" }
  ]
}
EOF
aliyun ram CreatePolicy \
  --PolicyName fc-deployer \
  --PolicyDocument "$(cat /tmp/fc-deployer.json | tr -d '\n')" \
  --Description "FC3 deploy permissions (cn-shanghai, account $ACCOUNT)" \
  --profile <your-admin-profile>

# 3) 创建 <repo>-deployer role
TRUST=$(cat <<EOF | tr -d '\n'
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": ["acs:ram::$ACCOUNT:oidc-provider/github-actions"] },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "oidc:aud": "$AUDIENCE" },
      "StringLike": { "oidc:sub": [
        "repo:$GITHUB_OWNER/$REPO:ref:refs/heads/main",
        "repo:$GITHUB_OWNER/$REPO:ref:refs/tags/*"
      ] }
    }
  }],
  "Version": "1"
}
EOF
)
aliyun ram CreateRole \
  --RoleName "$REPO-deployer" \
  --Description "GitHub Actions deploy role for $GITHUB_OWNER/$REPO" \
  --AssumeRolePolicyDocument "$TRUST" \
  --MaxSessionDuration 3600 \
  --profile <your-admin-profile>

# 4) 挂策略到 role
aliyun ram AttachPolicyToRole \
  --PolicyName fc-deployer \
  --PolicyType Custom \
  --RoleName "$REPO-deployer" \
  --profile <your-admin-profile>

# 5) 拿 RoleArn
echo "ROLE_ARN=acs:ram::$ACCOUNT:role/$REPO-deployer"

# 6) 注入 GitHub Secret
ROLE_ARN="acs:ram::$ACCOUNT:role/$REPO-deployer"
gh secret set FC_DEPLOY_ROLE_ARN --repo "$GITHUB_OWNER/$REPO" --body "$ROLE_ARN"
gh secret set PROD_ENV_FILE --repo "$GITHUB_OWNER/$REPO" < deploy/fc/prod.env
```

## 4. 仓库端 GitHub Actions

### 4.1 仓库结构

```
.github/
├── README.md                          ← 配置指引（README 风格）
├── actions/fc-deploy-env/action.yml    ← composite action（OIDC→STS→~/.s/access.yaml）
└── workflows/
    ├── ci.yml                         ← push/PR 全跑 typecheck + lint + test + arch:check
    └── deploy.yml                     ← main push 触发，依赖 ci job
```

### 4.2 必须的 GitHub Secrets（仅 2 个）

| Secret | 值 | 来源 |
| --- | --- | --- |
| `FC_DEPLOY_ROLE_ARN` | `<role-arn>`（见 §3 第 5 步） | aliyun 控制台 / CLI 输出 |
| `PROD_ENV_FILE` | `deploy/fc/prod.env` 整文件原文（多行） | 本地仓库 `deploy/fc/prod.env`，**不**提交 |

**没有静态 AK**。GH Actions 权限配置只需要：

```yaml
permissions:
  contents: read
  id-token: write    # 必须：用于 OIDC
```

### 4.3 composite action 关键 inputs

`.github/actions/fc-deploy-env/action.yml` 默认值（一般不需要改）：

| Input | 默认值 | 备注 |
| --- | --- | --- |
| `role-arn` | (无默认) | 必填，传入 `secrets.FC_DEPLOY_ROLE_ARN` |
| `audience` | `aliyun-fc-yishan-tan` | `oidc:aud` claim |
| `account-id` | `1650595695532785` | s CLI `AccountID` |
| `region` | `cn-hangzhou` | STS endpoint region |
| `oidc-provider-arn` | `acs:ram::1650595695532785:oidc-provider/github-actions` | IdP ARN |
| `profile-name` | `default` | 写到 `~/.s/access.yaml` 的 key，与 `s.yaml` `access:` 对齐 |
| `prod-env-file` | (无默认) | 必填，传入 `secrets.PROD_ENV_FILE` |

## 5. 多 repo 复用

账号 `1650595695532785` 下，**只需新增一对资源**就能给新 repo 上 OIDC deploy：

| 资源 | 新增项 |
| --- | --- |
| OIDC IdP | **不用动**（账号级共享，仍叫 `github-actions`） |
| ClientId（audience） | **追加**到现有 IdP 的 `ClientIds` 列表，例如新增 `aliyun-fc-yishan-flow` |
| Policy | **不用动**（仍是 `fc-deployer`） |
| RAM Role | 新建 `yishan-flow-deployer`，trust policy 用 `oidc:aud = aliyun-fc-yishan-flow` + `oidc:sub = repo:daifuyang/yishan-flow:ref:refs/heads/main` + `:tags/*` |
| GitHub Secret | 给新 repo 设 `FC_DEPLOY_ROLE_ARN=<新 role-arn>` + 自己的 `PROD_ENV_FILE` |

## 6. 故障速查表

| 错误 | 原因 | 排查 |
| --- | --- | --- |
| `AssumeRoleWithOIDC: InvalidParameter.RoleArn` | `FC_DEPLOY_ROLE_ARN` Secret 配错 | 用 `gh secret list` 校对；用 `aliyun ram GetRole --RoleName yishan-tan-deployer` 看 ARN |
| `AssumeRoleWithOIDC: AccessDenied` | RAM role 没绑策略 / trust policy 的 `oidc:aud` 不匹配 / `oidc:sub` filter 不匹配 | `aliyun ram ListPoliciesForRole --RoleName yishan-tan-deployer` 看是否挂了 `fc-deployer`；GetRole 看 trust policy |
| `AssumeRoleWithOIDC: ... is not authorized to perform sts:AssumeRoleWithOIDC` | RAM role 信任策略不是 OIDC 身份类型 | 重新创建 role（信任策略创建后改不了） |
| `MissingParameter.OIDCProviderArn` | 漏 `--OIDCProviderArn` | composite action defaults 已填，确认 deploy.yml 没把它覆盖掉 |
| `API.Forbidden` (CAS 类) | 当前 AK 没有对应权限 | 换有权限的 profile，或单独加系统策略 |
| `Profile default is not configure yet` (aliyun CLI) | `~/.aliyun/config.json` 没有 profile | composite action 自动 seed 一个 `fcdeploy` placeholder；如果手跑没 seed，加 `aliyun configure --profile fcdeploy` 或参考 §3 |
| `CAExited: 412`（FC custom runtime） | 不是真错误：FC sync invoke 把函数"主动退出"报为 CAExited 412。migrator bootstrap 退出 0 时日志里会有 `[db-migrate] OK`，`scripts/migrate-invoke.sh` 已 grep 该 marker 兜底 |
| `Unrecognized named-value: secrets` | composite action step 不能直接读 `secrets` context | 必须走 `inputs.prod-env-file`，由 workflow 用 `${{ secrets.X }}` 喂进去 |
| `node: not found` | FC `custom.debian12` 默认**没有** node | s.yaml environmentVariables 注入 `PATH=/var/fc/lang/nodejs22/bin:...`（FC3 自带 node-22） |

## 7. 切流与下线 checklist

切流（新资源替旧）：

1. 保留旧 IdP / role / policy，**新建**新 IdP `github-actions`（必须删旧的，因为 issuer URL 唯一）、新 role `<repo>-deployer`、新 policy `fc-deployer`
2. 切 GH Secret `FC_DEPLOY_ROLE_ARN` 到新 RoleArn
3. push 一次 main，验证 run 全绿、`s info` 显示新 role 名
4. 旧资源保留 1 个 release 后再删（防回滚找不到 ARN）

下线（repo 不再需要 OIDC deploy）：

1. `aliyun ram DeleteRole` + `DetachPolicyFromRole` + `DeletePolicy`（保留 IdP，其它 repo 还在用）
2. 删除 GH Secrets
3. 删除 `.github/workflows/deploy.yml` / composite action

## 8. 本地开发提示

- 本地跑 `npm run deploy` → `s deploy` 读 `~/.s/access.yaml` 的 `default` profile。本地长 AK 可塞同一 profile（CI 会临时覆盖成 STS，但 CI 与本地的 `~/.s` 互不影响）。
- 本地跑 `scripts/migrate-invoke.sh` 直接调用 `s cli fc3 invoke`，需要本地 `default` profile 有 FC 调用权限。
- `aic` CLI 单独链路（cert 续签 / DNS 等），与本文档 OIDC 流程无关。

## 9. 相关文档

- `OWN.md`「## 部署约定」 — 项目级硬约束
- `CLAUDE.md`「## 部署」 — Claude 协同时关注点
- `deploy/fc/README.md` — FC3 函数产物层
- `deploy/fc/MIGRATOR.md` — migrator 函数专项
- `.github/README.md` — 配置指引（与本 doc 互补，更面向新手）