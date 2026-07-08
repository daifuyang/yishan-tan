# CLI 工具（`bin/yishan`）

Yishan Tan 自带一个由 OpenAPI 驱动的 CLI，基于 [Restish](https://rest.sh)。
所有 REST 端点都自动暴露成 CLI 子命令，类型提示、校验、鉴权都从
`src/lib/openapi/paths/*.ts` 单点维护。

---

## 安装（一次性）

1. 装 Restish 二进制：

   ```bash
   brew install restish
   # 或
   go install github.com/danielgtaylor/restish/cmd/restish@latest
   ```

2. 装 shell 补全（zsh / bash / fish / powershell 任选其一）：

   ```bash
   restish shell setup zsh
   ```

3. 把仓库里的 `bin/` 加到 `PATH`，或者直接在仓库根执行：

   ```bash
   bin/yishan --help
   ```

---

## 拿 API Token

固定 token 模式（参考 OpenAI `sk-`、GitHub PAT、Stripe `sk_live_`）。
**不**走 session 兑换、**不**走 OAuth 浏览器流。

1. 登录后台 Admin → API Keys（或 `bin/yishan api-keys list` 看你已有的）
2. 点「创建」，填 `name` + `expires_in`（强制 ≤ 1 年）
3. **复制明文 key**（只显示一次，DB 里只存 hash）
4. 配到本地（任选一种）：

   ```bash
   # 优先级 1：临时一次性
   bin/yishan users list --token yishantan_xxxxxxxxxxxx

   # 优先级 2：环境变量（推荐 CI）
   export YISHAN_API_KEY=yishantan_xxxxxxxxxxxx
   bin/yishan users list

   # 优先级 3：本地凭证文件（推荐个人开发机，chmod 600）
   mkdir -p ~/.config/yishan && chmod 700 ~/.config/yishan
   cat > ~/.config/yishan/credentials <<'EOF'
   [yishan]
   api_key = yishantan_xxxxxxxxxxxx
   EOF
   chmod 600 ~/.config/yishan/credentials
   ```

加载顺序跟 Restish 一致：`--token` flag > `YISHAN_API_KEY` env > `~/.config/yishan/credentials`。

---

## 常用命令

| 命令 | 干啥 |
|---|---|
| `bin/yishan --help` | 看顶层子命令（按 tag 分组：users / roles / menus / ...） |
| `bin/yishan api sync` | 从仓库内 `openapi.generated.json` 重新发现命令 |
| `bin/yishan users list-users -f 'body.data.items[]' -o table --rsh-columns id,email,status` | 表格化列出用户 |
| `bin/yishan users list-users -o json` | 完整 JSON（分页外壳） |
| `bin/yishan users list-users -o ndjson \| jq .` | 流式 NDJSON，每行一条 |
| `bin/yishan users get-user <uuid>` | 查单个用户 |
| `bin/yishan users create-user 'email:a@b.com password=xxxxxxxx username=foo'` | 注册用户 |
| `bin/yishan users update-user <uuid> status=disabled` | 改用户状态 |
| `bin/yishan roles list-roles -f 'body.data.items[]' -o table --rsh-columns name,userCount` | 列角色 |
| `bin/yishan roles create-role 'name=运营 menuIds=m1,m2'` | 建角色 |
| `bin/yishan system-options get-system-option site.name` | 取单条系统配置 |
| `bin/yishan system-options batch-set-system-options 'items:[{key:a,value:1}]'` | 批量设置 |
| `bin/yishan api-keys list-api-keys` | 看你自己的 token 列表（明文不会回显） |
| `bin/yishan api-keys create-api-key name=ci-deploy` | 申领新 key（明文只返一次） |
| `bin/yishan storages list-storages --driver=aliyun-oss` | 按 driver 过滤存储 |
| `bin/yishan dicts-data list-dict-data --typeCode=user_status` | 按类型过滤字典 |

> **为什么列表查询要带 `-f 'body.data.items[]'`？**
>
> Yishan Tan 的分页响应壳是 `{ ok: true, data: { items: [...] }, meta: { total, page, pageSize } }`，
> Restish 内置分页默认认 HTTP `Link: next` header 或 `links.next` 字段，
> 对我们的信封不识别，所以表格/CSV/流式输出需要先用 `-f 'body.data.items[]'`
> 把数组拍出来，再交给输出格式化器。
>
> 不带 `-f` 时直接 `-o json` 看完整信封是 OK 的。

`--rsh-columns` / `--rsh-no-paginate` / `--rsh-max-pages` / `--rsh-collect` / `-o` 这些
Restish 通用 flag 全部生效，详见 `restish --help`。

---

## 改 schema / 增删端点后的同步

```bash
npm run openapi:gen    # 重新生成 openapi.generated.json
bin/yishan api sync    # 让本地 restish 重新发现命令
```

或者直接重启终端也行。

---

## CI 集成

CI 不用 `bin/yishan`，直接走 OpenAPI spec 做契约校验：

```bash
# 把 spec 拉下来，校验所有 endpoint 形状对得上
curl -fsSL https://<host>/api/openapi/json > openapi.json
npx @redocly/cli lint openapi.json
```

或者用 openapi-typescript 生成 SDK 给测试用：

```bash
npx openapi-typescript https://<host>/api/openapi/json -o sdk.ts
```

---

## 工作原理（不关心可跳过）

```
                ┌───────────
                │ bin/yishan
                │   └─ exec restish yishan "$@"
                │
                │ .restish.json (仓库内，commit)
                │   ├─ base_url
                │   ├─ spec_files: ./openapi.generated.json
                │   ├─ command_layout: tags
                │   ├─ pagination: items_path=data.items, page_param=page
                │   └─ headers.x-api-key: env:YISHAN_API_KEY
                │
                │ ~/.config/yishan/credentials (本地，chmod 600)
                │   └─ api_key
                │
                ▼
            Restish CLI
                │
                │ 读 ./openapi.generated.json 推导子命令
                │ 每个 operationId → 一个 kebab-case 子命令
                │
                ▼
            HTTP 请求 → Yishan Tan REST API
                │
                │ x-api-key header
                │
                ▼
            { ok, data, meta? } 响应
                │
                ▼
            Restish 自动按 -o 格式化（json / table / csv / gron / ndjson...）
```

`openapi.generated.json` 在每次 `npm run dev` / `npm run build` 自动重生成，
由 `src/lib/openapi/paths/<domain>.ts` 里的 `registry.registerPath` 汇总而来。
schema 单一信源 = Zod（既给运行时校验用、也给 OpenAPI 注册用），不维护双份。

---

## 已知取舍

- `x-cli-aliases` 没有铺开（短别名 `ul` / `rcl` 等没建），按需可在 `paths/*.ts` 里加。
- 不补 hooks / 自定义 formatter（轻量包装路线）：401 自动重试、错误码汉化这类增强可后续单独迭代。
- `portals` / `attachments` / `login-logs` 三个 feature 当前没有 REST 路由，CLI 不覆盖。先补 REST 再加 OpenAPI 注册。
- 树形响应（`menus?tree=1` / `departments?tree=1`）的 `children` 字段在 spec 里是 `unknown[]`，
  不是递归 schema —— 这是 zod v4 + zod-to-openapi 8.5 在递归 safeParse 上栈溢出的 workaround。
  对 CLI 调用没影响。
- `storage.config` 敏感字段（`accessKeySecret` 等）在响应里被 redact 成 `"******"`，
  跟 `src/features/storages/storages.service.ts` 的 `redactConfig` 行为一致。
  CLI 不能从 `GET /storages/:id` 反推原始 secret。