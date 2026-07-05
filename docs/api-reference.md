# REST API 参考

> 当前基座 v1 全部 REST 路由。所有路由以 `/api/v1/*` 开头，资源名使用复数。鉴权默认要求已登录（session cookie 或 `x-api-key`），需要系统管理员的接口会在「权限」列明确标注。

## 1. 公共约定

### 1.1 响应结构

成功：

```json
{ "ok": true, "data": {} }
```

分页：

```json
{
  "ok": true,
  "data": { "items": [] },
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}
```

失败：

```json
{ "ok": false, "code": "INVALID", "error": "请求参数不合法", "details": {} }
```

### 1.2 鉴权

- Web：浏览器请求自动携带 session cookie
- 自动化：请求头 `x-api-key: yishantan_xxx`
- 内部接口要求系统管理员：`SYSTEM_ADMIN_IDS` 环境变量配置

### 1.3 错误码

| Code | HTTP | 含义 |
| --- | --- | --- |
| `UNAUTHENTICATED` | 401 | 未登录 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突或被占用 |
| `INVALID_CREDENTIALS` | 401 | 凭证错误 |
| `INVALID` | 400 | 参数不合法 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INTERNAL` | 500 | 内部错误 |

## 2. 健康检查

### `GET /api/health`

无需鉴权。

成功：

```json
{ "ok": true, "service": "yishan-tan", "time": "2026-01-01T00:00:00.000Z" }
```

## 3. 认证与会话

### `POST /api/v1/users`

用户注册。无需鉴权。

请求体：

```json
{
  "email": "user@example.com",
  "username": "user_01",
  "password": "validpass1",
  "displayName": "User 01"
}
```

返回 201 + 用户公开信息。

### `POST /api/v1/sessions`

登录。无需鉴权。限流：按 `email + clientIp` 10 次 / 60 秒。

请求体：

```json
{ "email": "user@example.com", "password": "validpass1" }
```

返回 201：

```json
{ "ok": true, "data": { "user": { "id": "...", "email": "...", "username": "...", "displayName": "...", "role": "admin" } } }
```

### `DELETE /api/v1/sessions`

登出。需要鉴权。

返回：

```json
{ "ok": true, "data": { "ok": true } }
```

### `GET /api/v1/users/me`

获取当前用户。

返回：

```json
{ "ok": true, "data": { "user": {} } }
```

### `PATCH /api/v1/users/me`

修改当前用户密码。

请求体：

```json
{ "oldPassword": "validpass1", "newPassword": "newpass1" }
```

### `GET /api/v1/users/me/login-logs`

查询参数：`page`、`pageSize`。

返回：

```json
{ "ok": true, "data": { "items": [...], "total": 0 } }
```

## 4. API Key

### `GET /api/v1/api-keys`

列出当前用户的 API Key。

### `POST /api/v1/api-keys`

创建 API Key。

请求体：

```json
{ "name": "ci-runner" }
```

返回 201：

```json
{ "ok": true, "data": { "key": "yishantan_xxx", "apiKey": {...} } }
```

注意：`key` 字段仅创建时返回一次。

### `DELETE /api/v1/api-keys/:id`

删除指定 API Key。

## 5. 用户管理（需要系统管理员）

### `GET /api/v1/users`

查询参数：

- `page` / `pageSize`
- `keyword`（用户名 / 邮箱 / 显示名模糊匹配）
- `status`（`enabled` / `disabled`）
- `roleId`

### `GET /api/v1/users/:id`

获取用户详情。

### `PATCH /api/v1/users/:id`

请求体：

```json
{
  "displayName": "New Name",
  "email": "user@example.com",
  "status": "enabled",
  "roleIds": ["uuid", "uuid"]
}
```

约束：禁止禁用 / 删除当前登录用户。

### `DELETE /api/v1/users/:id`

软删除。约束同 `PATCH`。

## 6. 角色管理（需要系统管理员）

### `GET /api/v1/roles`

查询参数：`page` / `pageSize` / `keyword` / `status`。

### `POST /api/v1/roles`

请求体：

```json
{
  "name": "Admin",
  "code": "admin",
  "description": "system admin",
  "status": "enabled",
  "menuIds": ["uuid"]
}
```

### `GET /api/v1/roles/:id`

返回包含 `menuIds` 的详情。

### `PATCH /api/v1/roles/:id`

请求体支持 `name` / `description` / `status` / `menuIds`。

### `DELETE /api/v1/roles/:id`

约束：仍有用户绑定时禁止删除。

## 7. 部门管理（需要系统管理员）

### `GET /api/v1/departments`

查询参数：

- `page` / `pageSize` / `keyword` / `status`
- `tree=1` 返回树形结构

### `POST /api/v1/departments`

请求体：

```json
{
  "parentId": "uuid",
  "name": "Tech",
  "code": "tech",
  "sort": 0,
  "status": "enabled"
}
```

### `PATCH /api/v1/departments/:id`

请求体支持 `parentId` / `name` / `sort` / `status`。

约束：上级不能为自身。

### `DELETE /api/v1/departments/:id`

约束：存在子部门时禁止删除。

## 8. 菜单管理（需要系统管理员）

### `GET /api/v1/menus`

查询参数：

- `page` / `pageSize` / `keyword` / `status` / `type`
- `tree=1` 返回树
- `authorized=tree` 返回当前用户的授权菜单树
- `authorized=paths` 返回当前用户的授权路径列表

### `POST /api/v1/menus`

请求体：

```json
{
  "parentId": "uuid",
  "name": "Dashboard",
  "path": "/dashboard",
  "component": "Dashboard",
  "icon": "home",
  "type": "menu",
  "permission": "dashboard:view",
  "sort": 0,
  "status": "enabled"
}
```

### `PATCH /api/v1/menus/:id`

请求体支持 `parentId` / `name` / `path` / `component` / `icon` / `type` / `permission` / `sort` / `status`。

### `DELETE /api/v1/menus/:id`

约束：存在子菜单或被角色绑定时禁止删除。

## 9. 系统配置（写操作需要系统管理员）

### `GET /api/v1/system-options/:key`

获取单条配置。读操作只要求登录。

### `PUT /api/v1/system-options/:key`

请求体：

```json
{ "value": "1", "description": "x" }
```

key 必须匹配 `^[a-z0-9_.-]+$`。

### `POST /api/v1/system-options`

批量读取。

请求体：

```json
{ "keys": ["site.title", "site.locale"] }
```

### `POST /api/v1/system-options/batch`

批量写入。

请求体：

```json
{
  "items": [
    { "key": "site.title", "value": "Yishan" },
    { "key": "site.locale", "value": "zh-CN" }
  ]
}
```

最多 100 项，单项 key 必须匹配合法字符规则。

## 10. 字典（需要系统管理员）

### `GET /api/v1/dict-types`

查询参数：`page` / `pageSize` / `keyword` / `status`。

### `POST /api/v1/dict-types`

请求体：

```json
{ "name": "Sex", "code": "sex", "description": "", "status": "enabled" }
```

### `GET /api/v1/dict-types/:id`

### `PATCH /api/v1/dict-types/:id`

### `DELETE /api/v1/dict-types/:id`

### `GET /api/v1/dicts-data`

查询参数：`page` / `pageSize` / `keyword` / `typeCode` / `status`。

### `POST /api/v1/dicts-data`

请求体：

```json
{
  "typeCode": "sex",
  "label": "Male",
  "value": "1",
  "sort": 0,
  "status": "enabled",
  "extra": "{\"x\":1}"
}
```

约束：`typeCode` 必须指向存在的字典类型。

### `GET /api/v1/dicts-data/:id`

### `PATCH /api/v1/dicts-data/:id`

请求体支持 `label` / `value` / `sort` / `status` / `extra`。

### `DELETE /api/v1/dicts-data/:id`

## 11. 接口清单索引

| 模块 | 路径 | 数量 |
| --- | --- | --- |
| Health | `/api/health` | 1 |
| Auth | `/api/v1/users`, `/api/v1/sessions`, `/api/v1/users/me*` | 6 |
| API Key | `/api/v1/api-keys*` | 3 |
| Users | `/api/v1/users*` | 4 |
| Roles | `/api/v1/roles*` | 5 |
| Departments | `/api/v1/departments*` | 4 |
| Menus | `/api/v1/menus*` | 5 |
| System Options | `/api/v1/system-options*` | 4 |
| Dict Types | `/api/v1/dict-types*` | 5 |
| Dict Data | `/api/v1/dicts-data*` | 5 |
| **合计** | — | **42** |