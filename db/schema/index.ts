import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role_kind", ["admin", "member"]);
export const userGenderEnum = pgEnum("user_gender", ["male", "female", "other"]);
export const statusEnum = pgEnum("status", ["enabled", "disabled"]);
export const menuTypeEnum = pgEnum("menu_type", ["group", "menu", "action"]);
export const dataScopeEnum = pgEnum("data_scope", ["1", "2", "3", "4", "5"]);
export const storageDriver = pgEnum("storage_driver", [
  "local",
  "aliyun-oss",
  "tencent-cos",
  "aws-s3",
  "qiniu",
  "minio",
]);

export const portalThemeMode = pgEnum("portal_theme_mode", ["light", "dark"]);

export const attachmentCategory = pgEnum("attachment_category", [
  "image",
  "video",
  "document",
  "audio",
  "other",
]);

/**
 * better-auth 核心表。字段命名严格遵循 better-auth 默认约定，
 * 如需扩展业务字段请加到 additionalFields 配置中，避免在表里添加未声明列。
 */
export const user = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name").notNull(),
  image: text("image"),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("member"),
  deptId: uuid("dept_id").references(() => department.id, { onDelete: "set null" }),
  gender: userGenderEnum("gender"),
  birthDate: timestamp("birth_date", { mode: "date" }),
  remark: text("remark"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const account = pgTable("account", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const verification = pgTable("verification", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const apikey = pgTable("apikey", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: text("config_id").notNull().default("default"),
  name: text("name"),
  start: text("start"),
  prefix: text("prefix"),
  key: text("key").notNull(),
  referenceId: uuid("reference_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lastRequest: timestamp("last_request", { withTimezone: true }),
  lastRefillAt: timestamp("last_refill_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
  rateLimitMax: text("rate_limit_max"),
  rateLimitTimeWindow: text("rate_limit_time_window"),
  refillInterval: text("refill_interval"),
  refillAmount: text("refill_amount"),
  remaining: text("remaining"),
  requestCount: text("request_count").notNull().default("0"),
  permissions: text("permissions"),
  metadata: text("metadata"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const role = pgTable("role", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  status: statusEnum("status").notNull().default("enabled"),
  dataScope: dataScopeEnum("data_scope").notNull().default("1"),
  isSystemDefault: boolean("is_system_default").notNull().default(false),
  creatorId: uuid("creator_id").references(() => user.id, { onDelete: "set null" }),
  updaterId: uuid("updater_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  leaderId: uuid("leader_id").references((): any => user.id, { onDelete: "set null" }),
  sort: integer("sort").notNull().default(0),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const menu = pgTable("menu", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  path: text("path"),
  component: text("component"),
  icon: text("icon"),
  type: menuTypeEnum("type").notNull().default("menu"),
  permission: text("permission"),
  sort: integer("sort").notNull().default(0),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const userRole = pgTable(
  "user_role",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const roleMenu = pgTable(
  "role_menu",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => menu.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.menuId] })],
);

export const dictType = pgTable("dict_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const dictData = pgTable("dict_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  typeCode: text("type_code").notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sort: integer("sort").notNull().default(0),
  status: statusEnum("status").notNull().default("enabled"),
  extra: text("extra"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const loginLog = pgTable("login_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
  username: text("username"),
  status: text("status").notNull(),
  message: text("message"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * 系统选项 key/value 形式的轻量 KV 表，用于站点配置、字典、灰度开关等。
 * value 统一存为 JSON 字符串，由调用方反序列化。
 */
export const systemOption = pgTable("sys_option", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * 云存储驱动配置：每条记录对应一套对象存储（local / OSS / COS / S3 / 七牛 / MinIO），
 * 与 driver 枚举约定。config 字段按 driver 形态存放 JSON 字符串。
 *
 * 唯一性约束：`is_default = true` 且未删除的记录至多一条，
 * 通过 partial unique index 在数据库层强制（service 也再做一次事务校验）。
 */
export const storage = pgTable(
  "storage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    driver: storageDriver("driver").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    config: text("config").notNull(),
    description: text("description"),
    status: statusEnum("status").notNull().default("enabled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("storage_default_unique_idx")
      .on(sql`(true)`)
      .where(sql`${t.isDefault} = true AND ${t.deletedAt} IS NULL`),
  ],
);

/**
 * 门户：C 端一套独立的站点配置（logo / 主题 / 域名），同一时间最多一个默认。
 *
 * code 业务标识（slug），name 显示名，domain 可选绑定域名。
 * themePrimary 形如 #RRGGBB；themeMode 是 light / dark 二选一。
 *
 * 唯一性约束：`is_default = true` 且未删除的记录至多一条，
 * 通过 partial unique index 在数据库层强制（service 也再做一次事务校验）。
 */
export const portal = pgTable(
  "portal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    domain: text("domain"),
    logoUrl: text("logo_url"),
    themePrimary: text("theme_primary"),
    themeMode: portalThemeMode("theme_mode").notNull().default("light"),
    description: text("description"),
    isDefault: boolean("is_default").notNull().default(false),
    status: statusEnum("status").notNull().default("enabled"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("portal_default_unique_idx")
      .on(sql`(true)`)
      .where(sql`${t.isDefault} = true AND ${t.deletedAt} IS NULL`),
  ],
);

export const post = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => department.id, { onDelete: "restrict" }),
  sort: integer("sort").notNull().default(0),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const userPost = pgTable(
  "user_post",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

/**
 * 媒体库附件记录。一次上传一条记录，存于默认 storage 驱动；uploaderId / storageId
 * 软引用（set null）：用户被删、存储被删时，附件记录本身保留。
 *
 * width / height 仅 image / video 场景填写，其它类型留空。
 */
export const attachment = pgTable("attachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id").references(() => user.id, { onDelete: "set null" }),
  storageId: uuid("storage_id").references(() => storage.id, { onDelete: "set null" }),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  width: integer("width"),
  height: integer("height"),
  category: attachmentCategory("category").notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DbUser = typeof user.$inferSelect;
export type DbSession = typeof session.$inferSelect;
export type DbAccount = typeof account.$inferSelect;
export type DbApiKey = typeof apikey.$inferSelect;
export type DbSystemOption = typeof systemOption.$inferSelect;
export type DbRole = typeof role.$inferSelect;
export type DbDepartment = typeof department.$inferSelect;
export type DbPost = typeof post.$inferSelect;
export type DbMenu = typeof menu.$inferSelect;
export type DbDictType = typeof dictType.$inferSelect;
export type DbDictData = typeof dictData.$inferSelect;
export type DbLoginLog = typeof loginLog.$inferSelect;
export type DbStorage = typeof storage.$inferSelect;
export type DbPortal = typeof portal.$inferSelect;
export type DbAttachment = typeof attachment.$inferSelect;

export const schemaTag = sql`yishan_tan_v1`;
