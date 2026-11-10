# EdgeOne 部署调研与 PoC 记录

> 2026-11-09 实测记录。本文是**参考资料与验证快照**，不是实施计划，也不代表已完成迁移。
> 结论基于本机实测与官方文档，线上状态以控制台为准。

## 1. 结论摘要

「用 EdgeOne 部署」有两种含义，本仓当前**两种都还不具备上线条件**：

| 形态 | 说明 | 当前状态 |
| --- | --- | --- |
| EdgeOne 标准版（EO） | CDN / WAF / 加速，回源到现有 FC3 | **被源站阻塞**：证书过期、FC3 函数不存在 |
| EdgeOne Makers 全栈 | Serverless + Cloud Functions | **被构建链阻塞**：官方 TanStack Start 适配器无法产出完整产物 |
| EdgeOne Makers 静态 SPA | 纯前端托管 + SPA fallback | **已部署上线**（2026-11-09，见 §8）：页面可访问，API 不可用 |

推荐保持不变：**先修源站，再用 EO 做回源加速（零代码改动）；全栈迁移等官方 Nitro preset。** 若只需展示前端界面，用 §8 的静态 SPA 预览即可。

## 2. 实测环境与线上发现

| 项 | 实测值 |
| --- | --- |
| Node / npm | v22.22.2 / 10.9.7 |
| `edgeone` CLI | 已全局安装 `1.6.47`（提示为最新版） |
| 登录态 | `edgeone whoami` → `You are not authenticated` |
| `@tanstack/react-start` | 实际安装 `1.168.27`（`package.json` 声明 `^1.95.0`） |
| `@edgeone/tanstack-start` | `1.1.0`，peer: vite `^5 \|\| ^6 \|\| ^7`、react-start `^1.0.0` |
| 工作区 | 大量既有未提交改动，PoC 全程在隔离副本中进行 |

线上探测（`https://tan.zerocmf.com/api/health`）：

1. **证书已过期**。仓库 `deploy/fc/certs/fullchain.cer` 与线上证书一致：Let's Encrypt，`notBefore=2026-07-10`、`notAfter=2026-10-08`。curl 直接报 `SEC_E_CERT_EXPIRED`。
2. **源站函数不存在**。忽略证书后返回 `404 FunctionNotFound: function 'yishan-tan' does not exist`，即 FC3 上当前没有可回源的应用实例。
3. CLI 未登录，无法执行 `link` / `deploy` / `env` 等需要账号的操作。

## 3. P0：EO 回源加速接入清单（零代码改动）

### 3.1 前置修复（必须先做）

1. 续签证书并更新 `deploy/fc/s.yaml` 的 `certConfig`，重新部署域名配置；或改由 EO 侧托管免费证书、回源走 HTTP。
2. 恢复 `yishan-tan` FC3 函数，确认 `curl https://<源站>/api/health` 返回 `200 {"ok":true,...}`。
3. 确认域名已完成 ICP 备案（选择「中国大陆」加速区域时必需）。

### 3.2 接入步骤

1. EdgeOne 控制台 → 添加站点 → 填写业务域名。
2. 选择套餐、加速区域（按备案情况）、接入模式；域名不在 DNSPod 时选 **CNAME 接入**最灵活。
3. 完成归属权验证（DNS TXT 或文件验证）。
4. 配置加速域名与**源站地址**。
   - ⚠️ 源站不要写与加速域名完全相同的主机名，否则 CNAME 会形成回源自指循环。
   - 建议单独准备回源域名（如 `origin.<domain>`）直指 FC3，或直接使用 FC3 默认域名 `*.cn-shanghai.fcapp.run`。
5. 缓存规则：
   - `/assets/*` 与 `.js/.css/.svg/.woff2` 设长 TTL；
   - `/api/*`、所有 SSR 页面 **不缓存**（动态内容 + Cookie 会话）；
   - 静态资源的缓存键忽略 Cookie，动态路径保留 Cookie 与查询串。
6. HTTPS：申请 EO 免费证书、开启强制 HTTPS；回源协议按证书修复情况选 HTTPS 或 HTTP。
7. DNS：把业务域名 CNAME 指向 EO 分配的接入地址，验证解析生效后再切流。
8. 安全：开启 DDoS 基础防护、WAF、速率限制。

### 3.3 验收

- `curl -I` 能看到 EO 节点响应头；静态资源命中缓存、动态请求回源。
- `/api/health` 返回 200；登录态 Cookie 不被缓存串号。
- 后台列表查询、重置、翻页、编辑弹层等交互回归（见 `admin-list-standard.md`）。

## 4. P2 PoC：官方适配器构建验证

隔离方式：项目内 `.edgeone-poc/` 副本（复制 `src/ db/ public/ scripts/` 与配置），复用上层 `node_modules`，仅在副本内安装适配器。主仓 `package.json`、`package-lock.json`、`vite.config.ts` 与既有未提交改动均未改动。

配置：移除 `nitro()`，加入 `edgeoneAdapter()`；产物目标 `.edgeone/`。

| 轮次 | 改动 | 结果 |
| --- | --- | --- |
| 1 | 原样换适配器 | Vite 构建成功（`✓ built in 1.89s`），但 adapter 失败：`Could not resolve "C:Usersdfy...server.js"` |
| 2 | 修补 `@edgeone/vite-core` 的路径转义 | 路径问题解决，暴露新错误：esbuild 无法解析 `#tanstack-router-entry`、`#tanstack-start-entry`、`tanstack-start-manifest:v` |
| 3 | 再移除 `ssr.noExternal`（原为 Nitro 加的） | 三个虚拟模块错误依旧，与 `ssr.noExternal` 无关 |

根因证据：

- `@edgeone/vite-core/dist/utils.js` 的 `generateServerWrapperCode()` 直接写 `import * as serverBuild from "${serverEntryPath}";`，Windows 反斜杠未转义，生成的 `server-wrapper.temp.js` 里路径被 esbuild 吞掉。**这是 Windows 平台 bug**，Linux / CI 上应不会出现。
- 第二个错误发生在 adapter 用 esbuild 对 `dist/server/server.js` 做二次打包时（Vite 自身构建已成功），即 adapter 缺少 TanStack Start 虚拟模块的 alias/解析环境。该类错误在 TanStack Start 的 server/client 边界问题中也常见，但此处出现在二次打包阶段，属于适配器与当前 react-start 版本的兼容缺口。
- 附带 warning：`drizzle-orm/postgres-js`、`better-auth/crypto` 的副作用 import 因包内 `sideEffects: false` 被忽略，运行时需额外验证。

**结论：本机（Windows）无法产出可部署的 `.edgeone/` 完整产物；即使换 Linux，也仍需解决虚拟模块解析。不建议现在全量迁移。**

> 环境限制：尝试用 WSL 验证 Linux 构建时被本机安全策略拦截（程序黑名单），未做等价绕过，因此「Linux 上能跑通」仅为推断，未实测。

## 5. CLI 参数校正（以本机 1.6.47 实测为准）

`edgeone makers` 实际子命令：`init / dev / generate-routes / env / link / deploy / claim / create`。**没有 `build` 子命令**。

`edgeone makers deploy [directoryOrZip]` 实际参数：

| 参数 | 说明 |
| --- | --- |
| `-n, --name` | 项目名 |
| `-t, --token` | API Token（CI 用，替代登录） |
| `-e, --env` | `production` / `preview`（默认 production） |
| `-a, --area` | `global` / `overseas`（默认 global） |
| `--json` | 输出单行 JSON，便于 Agent / CI 消费 |
| `--anonymous` | 免登录临时部署，60 分钟内需 claim |
| `--site` | `china` / `global`，**仅匿名部署时生效**，按出口 IP 自动判断 |

注意：文档里的 `--site` 常被误写成常规部署的区域参数，实测并非如此。CI 部署命令应为：

```bash
edgeone makers deploy -n <project> -t "$EDGEONE_API_TOKEN" -e production --json
```

## 6. 若未来全量迁移，仍需处理

- 数据库：现走 FC3 `vpcConfig` 私网连 PostgreSQL / Redis；Makers 无 VPC，需公网可达 + 白名单 + TLS + serverless 连接池。
- 迁移：现有 `yishan-tan-migrator` FC 函数需改为 CI 执行 `npm run db:migrate` 或用 `schedules`。
- 运行时：Cloud Functions Node 20（现 FC3 Node 22）、默认 30s（上限 120s，现 60s）、请求体 6MB（影响 `/api/uploads.ts`）。
- 域名与认证：`BETTER_AUTH_URL` / trusted origins / `APP_BASE_URL` 需换成新域名。
- 构建链：`scripts/build-fc.mjs`、`deploy/fc/`、OIDC 部署流程（见 `deploy-oidc.md`）整体替换。

## 7. 参考

- EdgeOne Makers CLI：<https://pages.edgeone.ai/document/edgeone-cli>
- TanStack Start 框架指南：<https://edgeone.ai/document/201258022376095744>
- 国内站同一指南：<https://cloud.tencent.com/document/product/1376/128253>
- 适配器源码：<https://github.com/TencentEdgeOne/vite-adapter>
- 配额：<https://pages.edgeone.ai/zh/document/limits-and-quotas>
- `edgeone.json`：<https://pages.edgeone.ai/document/edgeone-json>

## 8. 静态 SPA 预览版已上线（2026-11-09 追加）

用户提供 EdgeOne API Token 后，用**纯静态 SPA** 形态成功部署，原 FC3 站点与 Nitro 构建链零改动。

| 项 | 值 |
| --- | --- |
| 项目名 / Project ID | `yishan-tan-edgeone` / `makers-gohz1r4kwkhh` |
| 部署环境 | Production，`global` area（CLI 自动复用账号中已有的同名项目） |
| Deployment ID | `dpygol0v2ai1`（最新，含 `/admin` 降级修复；首版 `dpuw6ume24mi`） |
| 访问域名 | `https://yishan-tan-edgeone-tfi4hvzd.edgeone.cool` |
| 形态 | 静态资源 + SPA fallback，无 Cloud Functions |

做法：在隔离目录 `.edgeone-deploy/` 复制 `src/ db/ public/ scripts/` 与配置，用不含 `nitro()` 的 SPA Vite 配置构建（`tanstackStart({ spa: { enabled: true, prerender: { enabled: false } } })`），把 `dist/client/_shell.html` 复制为 `index.html`，再配 `edgeone.json` 的 SPA fallback 后上传。可复现配置见 `deploy/edgeone/`，其中 `overrides/src/routes/admin/route.tsx` 只在隔离构建中覆盖源码，主仓文件不受影响。

验证结果：

- 首页 `200`、静态 JS `200`；浏览器实际渲染出首页「Yishan Tan / TanStack Start 企业级底座 / 进入后台 / 检查 /api/health」。
- `/login`、`/admin`、`/admin/users` 均返回 `index.html`（SPA fallback 生效），登录页 UI 正常渲染。
- `/admin` 修复后重定向到 `/login?redirect=%2Fadmin`，不再白屏（见下方「/admin 报错」）。
- 平台在页面底部注入「For demonstration and testing purposes only」演示横幅，非站点内容。

### /admin 报错的两层原因

1. **401 `eo_time missing`**：直接打开不带 `?eo_token=...&eo_time=...` 的 URL 时会命中 EdgeOne 预览鉴权，响应头明确给出 `X-EOP-MSG: eo_time missing`。必须先用完整链接访问一次（302 写入 Cookie），或始终带上完整参数；这不是应用错误，绑自定义域名后可消除。
2. **带凭证后白屏 `TypeError: r is not iterable`**：`src/routes/admin/route.tsx` 的 `beforeLoad` 调用 `getCurrentUser()` / `getAuthorizedMenuPaths()` 两个 TanStack Start Server Functions；纯静态托管没有服务端，SPA fallback 把请求回退成 HTML，侧栏拿到的菜单树不是数组，递归时崩溃。首版在线上复现为「Something went wrong!」。修复方式是在预览专用 override 里让 `/admin` 直接 `redirect({ to: "/login" })`，避免进入依赖后端的后台 shell。这是预览降级，不是功能实现。

限制（重要）：

- **无后端**。Makers 上未部署任何 Cloud Function，SPA fallback 会把 `/api/*` 也回退成 `index.html`，因此登录、列表、健康检查等接口请求都拿不到 JSON，属于纯前端预览。
- 访问 URL 必须带完整 `?eo_token=...&eo_time=...`（首次访问 302 写入 Cookie）。**3 小时预览令牌是平台规则**，只作用于项目默认域名；链接失效后重新部署会生成新参数，反复重部署没有意义。稳定访问的唯一方式是在控制台「域名管理」绑定自定义域名：添加 TXT 归属验证 + CNAME 到控制台给出的 `*.pages.dnsoe5.com` 目标值，关联生产环境后始终指向最新成功部署、无令牌。本项目部署时未传 `-a`，使用 CLI 默认的 `global`（全球可用区，**含中国大陆**），该区域绑定自定义域名要求域名已完成 ICP 备案；`overseas`（全球可用区，不含中国大陆）才免备案。备案细则见 §9.5。
- 全栈能力（数据库、better-auth、28 个 API 路由）仍需等官方 Nitro preset，并处理 §6 的 VPC / 连接池问题。因此**预览版只能看首页与登录页 UI，后台与数据列表不可用**；点击「进入后台」会落到登录页。
- SPA 客户端路由跳转时控制台仍有一条 React #418 hydration 警告（shell 预渲染与重定向后内容不一致），页面显示正常，不影响预览。

复现命令（Token 不要写入仓库）：

```bash
EDGEONE_API_TOKEN=<token> bash deploy/edgeone/deploy.sh yishan-tan-edgeone
```

### 2026-11-10 复查

| 项 | 结果 |
| --- | --- |
| `tan.zerocmf.com` | 证书仍过期（`notAfter=2026-10-08`）；`/api/health` 仍 `404 FunctionNotFound` |
| EdgeOne 预览域名 | 项目仍在（裸访问返回 `401 eo_time missing`），昨日令牌已失效（带 token 也 401） |
| CLI | `whoami` 仍 `not authenticated`；API Token 有效，可用 `EDGEONE_PAGES_API_TOKEN` 免登录 |
| 官方 Nitro preset | 更新日志与「未支持功能」清单均仍标注未发布，适配器与 Nitro 不共存 |
| 仓库 | main 分支，120 个未提交改动（75 M / 42 ?? / 3 D），EdgeOne 四个交付文件与本文档均未纳入版本控制 |

**结论：部署能力已验证，但当前没有任何一条链路处于可用状态。** 优先修源站或绑定自定义域名，不要反复重部署换临时链接。

## 9. 可用域名盘点（2026-11-10 追加）

目的：给 `yishan-tan-edgeone` 找一个可长期访问的自定义域名，彻底去掉 3 小时预览令牌。

### 9.1 域名资产与 DNS 托管

| 主域 | NS | 备案 | 判断 |
| --- | --- | --- | --- |
| `zerocmf.com` | `dns19.hichina.com` / `dns20.hichina.com`（阿里云） | 已备案 | **首选**，含中国大陆区域也可用 |
| `daifuyang.com` | `dns31.hichina.com` / `dns32.hichina.com`（阿里云） | 已备案（苏ICP备16008291号） | 备用；已备案，两种区域都能用 |

两个主域的 DNS 都在阿里云，可直接添加 TXT / CNAME 记录。平台默认域名 `*.edgeone.cool` 一律需要 `eo_token`（3 小时），无 API / 开关可关闭，**不能作为长期入口**；免费版含 200 个自定义域名 + 免费 SSL。

### 9.2 在役域名（不要动）

| 域名 | DNS / HTTP 实测 | 说明 |
| --- | --- | --- |
| `tan.zerocmf.com` | CNAME 阿里云 FC；`/api/health` `404 FunctionNotFound` | **本项目原站点，当前是死的**，证书 2026-10-08 过期 |
| `admin.zerocmf.com` | A `43.143.122.225`；`/` 与 `/api/health` 均 `200`、`db.ok:true` | 另一个项目（yishan）的健康源站，证书到 2027-01-17 |
| `h5.zerocmf.com` | 同上，`200` + `db.ok:true` | 同上 |
| `yishan.zerocmf.com` | A `43.143.122.225`；`301 → admin.zerocmf.com` | 跳转中 |
| `daifuyang.com` | A `139.196.89.64`；`200`，标题「戴富阳 - 全栈开发者」 | 个人品牌站在用 |
| `www.daifuyang.com` | CNAME 阿里云 FC；`403 InvokeDisabled` | 函数被禁用，仍属已占用 |
| `cdn.zerocmf.com` / `dsh.zerocmf.com` / `dev.mp.zerocmf.com` / `axis.daifuyang.com` / `debug.daifuyang.com` | 均有解析记录 | 已占用 |

> **重要修正**：此前「源站全死」的判断不准确。死的是 `tan.zerocmf.com` 的阿里云 FC3 函数；`admin.zerocmf.com` / `h5.zerocmf.com` 走腾讯云 Ubuntu nginx，完全健康。但它们是 **yishan 项目（Fastify + MySQL）** 的源站，不是本项目的后端，不能混用作 `yishan-tan` 的回源。

### 9.3 空闲可用子域（无 DNS 记录，可直接新建）

| 推荐度 | 域名 | 备注 |
| --- | --- | --- |
| **P0** | `tan-edge.zerocmf.com` | **推荐给 `yishan-tan-edgeone`**：语义对应本项目、不与其它项目预留名冲突 |
| P1 | `yishan-edge.zerocmf.com` | 备选，语义稍宽泛 |
| P1 | `edge.zerocmf.com` / `eo.zerocmf.com` / `preview.zerocmf.com` | 通用备选 |
| P2 | `tan-edge.daifuyang.com` / `edge.daifuyang.com` / `eo.daifuyang.com` | daifuyang 侧也全空，且已备案 |
| 勿抢占 | `admin-edge.zerocmf.com`、`h5-edge.zerocmf.com`、`docs.zerocmf.com`、`portal-docs.zerocmf.com` | DNS 虽空，但 **yishan 项目日志已规划**给 H5 / Admin / 两个文档站，避免撞名 |
| 其它空闲 | `example.zerocmf.com`、`acme-reload-studio.zerocmf.com`、`www.zerocmf.com`、`preview.daifuyang.com` 等 | 共 12 个 zerocmf 子域 + 4 个 daifuyang 子域 |

### 9.4 绑定步骤（必须在控制台，CLI 无域名管理子命令）

1. 控制台 → 项目 `yishan-tan-edgeone` → **域名管理** → 添加自定义域名，填入 `tan-edge.zerocmf.com`。
2. 按弹窗指引在阿里云 DNS 添加 **TXT 归属权验证**记录，等待验证通过。
3. 添加 **CNAME** 记录指向控制台给出的目标（格式 `*.pages.dnsoe5.com`；参考项目默认域名 CNAME `013c344bef7f6e5e.edgeone.cool.pages.dnsoe5.com`，但**必须以控制台给出的值为准**）。
4. **申请免费证书**：Makers 不会自动签发，需在 HTTPS 配置里点「申请免费证书」（TrustAsia / Let's Encrypt RSA，平台自动部署与续签）。未配证书时自定义域名无法正常 HTTPS 访问。
5. 域名**关联生产环境**：此后始终指向该环境最新一次成功部署，无需 `eo_token`。
6. 验收：`curl -I https://tan-edge.zerocmf.com/` 返回 200 且无 401；`/login`、`/admin` 走 SPA fallback；`/assets/*` 命中缓存。

注意：CLI 的 `-a global`（默认值，本项目当前值）对应**全球可用区（含中国大陆）**，绑定自定义域名要求域名已完成 ICP 备案；`-a overseas` 对应全球可用区（不含中国大陆），免备案。`zerocmf.com` 与 `daifuyang.com` 均已备案，两种区域都能用。备案细则见 §9.5。

### 9.5 ICP 备案：需要在腾讯云重新备案吗？（2026-11-10 核实）

**结论：不需要。** 分三层说明。

1. **不存在「换个云平台就重备一次」**。ICP 备案由工信部核发，绑定的是「域名 + 主办主体」，备案号全国通用、不随接入商变化。换到腾讯云属于**接入商变更**，正确动作是「接入备案」（提交原备案号 + 主体信息，管局审核约 1–20 个工作日，**备案号不变**），不是重新备案。
2. **只用 EdgeOne 时，连接入备案也不用办**。腾讯云官方《备案云资源》「其他云资源备案检查拦截规则」表中 CDN/EO 一行原文：「域名在工信部已有 ICP 备案号，且在腾讯云仅使用 CDN/EO、WAF、高防 IP 等产品，ICP 备案信息**不强制要求接入腾讯云**。」Makers 是纯边缘加速、没有腾讯云 CVM / 轻量应用服务器作为源站，正落在这个豁免里。
   - **例外**：若以后把源站迁到腾讯云 CVM / Lighthouse，则必须做接入备案，否则未备案监测系统会阻断域名访问。
3. **加速区域决定要不要备案号**。Makers 官方《域名管理概览》：中国大陆可用区、全球可用区（含中国大陆）绑自定义域名须完成工信部备案；**全球可用区（不含中国大陆）不要求备案**。本项目当前是 `global`（含中国大陆，见上文），所以需要域名有备案号——两个主域都已备案，满足。

备案状态实测：

| 域名 | 备案号 | 依据 |
| --- | --- | --- |
| `daifuyang.com` | 苏ICP备16008291号 | 站点页脚实测抓到 |
| `zerocmf.com` | 备案号未抓到，判定已备案 | yishan 项目日志记载已备案；`tan.zerocmf.com` 使用阿里云国内 FC3 自定义域名（该能力通常要求备案） |

**子域名不需要单独备案**：ICP 备案在主域名层级，`tan-edge.zerocmf.com`、`eo.daifuyang.com` 等自动被主域备案覆盖。

实操提醒：控制台添加自定义域名时会实时校验工信部备案库，管局审核通过后数据同步可能有约 2 小时延迟；若提示「未备案」但工信部官网可查到，稍后重试或联系客服。最终以 <https://beian.miit.gov.cn/> 查询结果为准。

> **纠错记录**：早期版本曾把 `global` 误判为「不含中国大陆、免备案」，并把 `daifuyang.com` 记为「备案未确认」。两处均已按官方文档与实测更正。
