# 数据模型

> 描述 yishan-tan 当前 schema 包含的全部表、字段与枚举值。所有表位于 `db/schema/index.ts`，由 Drizzle ORM 管理。

## 1. 通用约定

- 主键统一为 UUID，生成策略 `defaultRandom()`
- 时间字段：
  - `createdAt` 默认 `now()`
  - `updatedAt` 默认 `now()` + `$onUpdate(() => new Date())`
- 软删除：统一使用 `deletedAt`（timestamp with timezone，可空）
- 状态枚举：`status` 字段统一使用 `enabled / disabled`

## 2. 枚举

| 名称 | 取值 | 用途 |
| --- | --- | --- |
| `user_role` | `admin` / `member` | better-auth user 表的角色字段 |
| `status` | `enabled` / `disabled` | 通用启用 / 停用 |
| `menu_type` | `group` / `menu` / `action` | 菜单类型（分组 / 菜单 / 按钮） |

## 3. 表清单

### 3.1 `user`

better-auth 用户表，字段严格遵循 better-auth 默认约定。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| email | text unique | |
| emailVerified | bool | |
| name | text | |
| image | text nullable | |
| username | text unique | |
| displayName | text nullable | |
| role | user_role enum | `admin` / `member`，保留作为兼容字段 |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.2 `session`

better-auth 会话表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid FK → user.id | `on delete cascade` |
| expiresAt | timestamp | |
| token | text unique | |
| ipAddress | text nullable | |
| userAgent | text nullable | |
| createdAt / updatedAt | timestamp | |

### 3.3 `account`

better-auth 账号表（支持 OAuth / 邮箱密码）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid FK → user.id | `on delete cascade` |
| providerId | text | |
| accountId | text | |
| password | text nullable | |
| accessToken / refreshToken / idToken | text nullable | |
| accessTokenExpiresAt / refreshTokenExpiresAt | timestamp nullable | |
| scope | text nullable | |
| createdAt / updatedAt | timestamp | |

### 3.4 `verification`

better-auth 验证表（邮箱验证 / 找回密码 token）。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| identifier | text | |
| value | text | |
| expiresAt | timestamp | |
| createdAt / updatedAt | timestamp | |

### 3.5 `apikey`

better-auth API Key 表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| name / start / prefix | text nullable | |
| key | text | 完整 key（仅创建时返回一次） |
| referenceId | uuid FK → user.id | API Key 所属用户，`on delete cascade` |
| userId | uuid FK → user.id | 创建者，`on delete cascade` |
| lastRequest | timestamp nullable | |
| rateLimitEnabled | bool | |
| rateLimitMax / rateLimitTimeWindow / requestCount | text | |
| expiresAt | timestamp nullable | |
| createdAt / updatedAt | timestamp | |

### 3.6 `role`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| name | text | 显示名 |
| code | text unique | 编码（如 `admin` / `editor`） |
| description | text nullable | |
| status | status enum | |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.7 `department`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| parentId | uuid nullable | 自引用 |
| name | text | |
| code | text unique | |
| sort | int | 同级排序，默认 0 |
| status | status enum | |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.8 `menu`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| parentId | uuid nullable | 自引用 |
| name | text | |
| path | text nullable | 路由路径 |
| component | text nullable | 前端组件路径 |
| icon | text nullable | |
| type | menu_type enum | `group` / `menu` / `action` |
| permission | text nullable | 操作权限码 |
| sort | int | 同级排序 |
| status | status enum | |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.9 `user_role`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| userId | uuid FK → user.id | `on delete cascade` |
| roleId | uuid FK → role.id | `on delete cascade` |
| createdAt | timestamp | |

复合主键：`(userId, roleId)`。

### 3.10 `role_menu`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| roleId | uuid FK → role.id | `on delete cascade` |
| menuId | uuid FK → menu.id | `on delete cascade` |
| createdAt | timestamp | |

复合主键：`(roleId, menuId)`。

### 3.11 `dict_type`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| name | text | 显示名 |
| code | text unique | 类型编码 |
| description | text nullable | |
| status | status enum | |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.12 `dict_data`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| typeCode | text | 关联 `dict_type.code`（无外键，便于动态扩展） |
| label | text | 选项显示名 |
| value | text | 选项值 |
| sort | int | 同类型排序 |
| status | status enum | |
| extra | text nullable | 扩展字段（JSON 字符串） |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.13 `sys_option`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| key | text unique | 合法字符 `^[a-z0-9_.-]+$` |
| value | text | 字符串值（由调用方序列化） |
| description | text nullable | |
| createdAt / updatedAt | timestamp | |
| deletedAt | timestamp nullable | 软删除 |

### 3.14 `login_log`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid PK | |
| userId | uuid nullable FK → user.id | `on delete set null` |
| username | text nullable | 登录时的用户名 / 邮箱 |
| status | text | `success` / `failed` |
| message | text nullable | 失败原因 |
| ipAddress | text nullable | |
| userAgent | text nullable | |
| createdAt | timestamp | |

## 4. 关系图

```text
user ──┬─< session
       ├─< account
       ├─< apikey
       ├─< login_log
       └─< user_role >─ role ──< role_menu >─ menu
                                       │
                                       └─ parentId self-ref tree

department (parentId self-ref tree)

dict_type (code) ─< dict_data (typeCode)

sys_option (key/value KV)
```

## 5. 索引与约束

- 所有 UUID 主键自动建索引
- 唯一约束：
  - `user.email`
  - `user.username`
  - `session.token`
  - `apikey.key`
  - `role.code`
  - `department.code`
  - `menu` 未设唯一约束（path 可空，不强制唯一）
  - `dict_type.code`
  - `sys_option.key`
- 外键约束集中在 better-auth 与角色 / 菜单 / 部门 / 登录日志
- 复合主键：`user_role`、`role_menu`

## 6. 命名约定

- 表名：snake_case 单数
- 字段名：snake_case
- 时间字段：`created_at` / `updated_at` / `deleted_at`
- 软删除字段：统一 `deletedAt`
- 状态字段：统一 `status` + `status` enum

## 7. 后续待补

- 文章 / 页面 / 分类 / 模板表
- 商品 / SKU / 订单表
- 附件表（含分组）
- 插件元数据表
- 审计字段标准化（操作人、操作时间）