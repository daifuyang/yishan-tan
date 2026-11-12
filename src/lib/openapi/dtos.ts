/**
 * 响应体 DTO 的 Zod schema 定义。
 *
 * 输入 schema（create/update/listQuery）走 features/<domain>/<domain>.schema.ts，
 * 但 DTO 之前只有 TS 类型没有 Zod 表达，所以这里统一补齐，
 * 既给 OpenAPI 生成用，也作为响应体校验的单一信源。
 *
 * 字段顺序和类型严格对齐 src/features/<domain>/<domain>.types.ts；nullable 字段用
 * `.nullable().optional()` 而非 `.optional()`，保留 DTO 中的 null vs undefined 区分。
 */
import { z } from "zod";
import { dataScopeSchema } from "~/features/roles/roles.schema";
import { menuTypeSchema, statusSchema, systemRoleSchema } from "./envelope";
import { registry } from "./registry";

const nullableString = z.string().nullable();
const nullableStringOptional = z.string().nullable().optional();
const isoDate = z.string().datetime({ offset: true }).openapi("IsoDateTime");
const uuid = z.string().uuid();

// ---------- auth ----------
export const publicUserSchema = z
  .object({
    id: uuid,
    email: z.string().email(),
    username: z.string(),
    displayName: nullableStringOptional,
    role: systemRoleSchema,
  })
  .openapi("PublicUser");

export const sessionEnvelopeSchema = z
  .object({
    user: publicUserSchema,
  })
  .openapi("SessionEnvelope");

// ---------- users ----------
export const adminUserDtoSchema = z
  .object({
    id: uuid,
    email: z.string().email(),
    username: z.string(),
    name: z.string(),
    displayName: nullableStringOptional,
    phone: nullableStringOptional,
    role: systemRoleSchema,
    status: statusSchema,
    roleIds: z.array(uuid),
    createdAt: isoDate,
    updatedAt: isoDate,
    lastLoginAt: isoDate.nullable().optional(),
  })
  .openapi("AdminUserDto");

export const loginLogDtoSchema = z
  .object({
    id: uuid,
    userId: nullableStringOptional,
    username: nullableStringOptional,
    status: z.string(),
    message: nullableStringOptional,
    ipAddress: nullableStringOptional,
    userAgent: nullableStringOptional,
    createdAt: isoDate,
  })
  .openapi("LoginLogDto");

export const apiKeyDtoSchema = z
  .object({
    id: uuid,
    name: nullableStringOptional,
    prefix: nullableStringOptional,
    start: nullableStringOptional,
    referenceId: z.string(),
    expiresAt: isoDate.nullable().optional(),
    lastRequest: isoDate.nullable().optional(),
    createdAt: isoDate,
  })
  .openapi("ApiKeyDto");

export const apiKeyCreateResponseSchema = z
  .object({
    key: z.string().describe("明文 API key，仅创建时返回一次，请立刻保存"),
    apiKey: apiKeyDtoSchema,
  })
  .openapi("ApiKeyCreateResponse");

// ---------- roles ----------
export const roleDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    description: nullableString,
    status: statusSchema,
    dataScope: dataScopeSchema,
    isSystemDefault: z.boolean(),
    creatorId: nullableString,
    creatorName: nullableString,
    updaterId: nullableString,
    updaterName: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("RoleDto");

export const roleListItemDtoSchema = roleDtoSchema.openapi("RoleListItemDto");

export const roleDetailDtoSchema = roleDtoSchema
  .extend({
    menuIds: z.array(uuid),
    permissionCodes: z.array(z.string()),
  })
  .openapi("RoleDetailDto");

// ---------- menus ----------
export const menuDtoSchema = z
  .object({
    id: uuid,
    parentId: nullableStringOptional,
    name: z.string(),
    path: nullableStringOptional,
    component: nullableStringOptional,
    icon: nullableStringOptional,
    type: menuTypeSchema,
    permission: nullableStringOptional,
    permissionCodes: z.array(z.string()),
    sort: z.number().int().min(0).max(9999),
    status: statusSchema,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("MenuDto");

/**
 * 树形菜单节点。OpenAPI 不递归展开 children（zod v4 + zod-to-openapi 8.5 的
 * safeParse 在递归 schema 上栈溢出），所以 children 用 z.array(z.unknown())
 * 占位。响应包络里 list 类的菜单树本质就是 MenuDto[]。
 */
export const menuNodeSchema = menuDtoSchema
  .extend({
    children: z.array(z.unknown()).optional(),
  })
  .openapi("MenuNode");

// ---------- departments ----------
export const departmentDtoSchema = z
  .object({
    id: uuid,
    parentId: nullableStringOptional,
    name: z.string(),
    code: z.string(),
    sort: z.number().int().min(0).max(9999),
    status: statusSchema,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("DepartmentDto");

export const departmentNodeSchema = departmentDtoSchema
  .extend({
    children: z.array(z.unknown()).optional(),
  })
  .openapi("DepartmentNode");

// ---------- dicts ----------
export const dictTypeDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    code: z.string(),
    description: nullableString,
    status: statusSchema,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("DictTypeDto");

export const dictTypeListItemDtoSchema = dictTypeDtoSchema
  .extend({
    dataCount: z.number().int().nonnegative(),
  })
  .openapi("DictTypeListItemDto");

export const dictDataDtoSchema = z
  .object({
    id: uuid,
    typeCode: z.string(),
    label: z.string(),
    value: z.string(),
    sort: z.number().int().min(0).max(9999),
    status: statusSchema,
    extra: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("DictDataDto");

// ---------- posts ----------
export const postDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    departmentId: uuid,
    departmentName: z.string(),
    sort: z.number().int().min(0).max(9999),
    status: statusSchema,
    userCount: z.number().int().nonnegative(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("PostDto");

// ---------- storages ----------
export const storageConfigValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const storageConfigSchema = z.record(z.string(), storageConfigValueSchema);

export const storageDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    driver: z.enum(["local", "aliyun-oss", "tencent-cos", "aws-s3", "qiniu", "minio"]),
    isDefault: z.boolean(),
    description: nullableString,
    status: statusSchema,
    configSummary: storageConfigSchema,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("StorageDto");

export const storageDetailDtoSchema = storageDtoSchema
  .extend({
    config: storageConfigSchema,
  })
  .openapi("StorageDetailDto");

// ---------- system-settings ----------
export const systemOptionDtoSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9_.-]+$/),
    value: z.string(),
    description: nullableString,
    updatedAt: isoDate,
  })
  .openapi("SystemOptionDto");

export const batchSetSystemOptionResponseSchema = z
  .object({
    updatedCount: z.number().int().nonnegative(),
    results: z.array(
      z.object({
        key: z.string(),
        ok: z.boolean(),
        value: z.string().optional(),
      }),
    ),
  })
  .openapi("BatchSetSystemOptionResponse");

// ---------- health ----------
export const serviceHealthSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal("yishan-tan"),
    time: isoDate,
  })
  .openapi("ServiceHealth");

// ---------- uploads ----------
export const attachmentDtoSchema = z
  .object({
    id: uuid,
    uploaderId: uuid,
    uploaderName: z.string().nullable().optional(),
    storageId: uuid,
    storageName: z.string().nullable().optional(),
    url: z.string(),
    name: z.string(),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    width: z.number().int().nonnegative().optional(),
    height: z.number().int().nonnegative().optional(),
    category: z.enum(["image", "video", "document", "audio", "other"]),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("AttachmentDto");

// ---------- portal-content ----------
const portalContentStatusSchema = z.enum(["enabled", "disabled"]);
const portalArticleStatusSchema = z.enum(["draft", "published"]);
const portalTemplateTypeSchema = z.enum(["article", "page"]);
const portalAttributesSchema = z.record(z.string(), z.string());

/**
 * 模板 json 字段的 OpenAPI 表达：递归 JSON。
 *
 * 必须**注册成命名 component 再用 $ref 引用**：zod-to-openapi 遇到内联的递归
 * Zod（`z.record(z.string(), z.json())` 之类）会无限递归，生成时直接
 * `Maximum call stack size exceeded`。
 */
export const portalTemplateJsonSchema = registry.register("PortalTemplateJson", z.json());
const portalTagsSchema = z.array(z.string());

export const portalCategoryDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    slug: nullableString,
    parentId: nullableString,
    status: portalContentStatusSchema,
    sortOrder: z.number().int(),
    description: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("PortalCategoryDto");

export const portalArticleDtoSchema = z
  .object({
    id: uuid,
    title: z.string(),
    slug: nullableString,
    summary: nullableString,
    content: z.string(),
    coverImage: nullableString,
    status: portalArticleStatusSchema,
    isPinned: z.boolean(),
    publishTime: nullableString,
    attributes: portalAttributesSchema.nullable(),
    tags: portalTagsSchema.nullable(),
    templateId: nullableString,
    categoryIds: z.array(z.string()),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("PortalArticleDto");

export const portalPageDtoSchema = z
  .object({
    id: uuid,
    title: z.string(),
    path: z.string(),
    status: portalContentStatusSchema,
    attributes: portalAttributesSchema.nullable(),
    publishTime: nullableString,
    published: z.boolean(),
    unpublishedChanges: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("PortalPageDto");

/** 页面详情：多带草稿 / 已发布的低代码 PageSchema。 */
export const portalPageDetailDtoSchema = portalPageDtoSchema
  .extend({
    draftSchema: z.record(z.string(), z.unknown()).nullable(),
    publishedSchema: z.record(z.string(), z.unknown()).nullable(),
  })
  .openapi("PortalPageDetailDto");

export const portalTemplateDtoSchema = z
  .object({
    id: uuid,
    name: z.string(),
    description: nullableString,
    type: portalTemplateTypeSchema,
    schema: portalTemplateJsonSchema.nullable(),
    config: portalTemplateJsonSchema.nullable(),
    status: portalContentStatusSchema,
    isSystemDefault: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .openapi("PortalTemplateDto");

// ---------- shared OK-envelope helpers ----------
export const okEnvelope = <T extends z.ZodTypeAny>(name: string, data: T) =>
  z
    .object({
      ok: z.literal(true),
      data,
    })
    .openapi(`Ok_${name}`);

export const okListEnvelope = <T extends z.ZodTypeAny>(name: string, item: T) =>
  z
    .object({
      ok: z.literal(true),
      data: z.object({ items: z.array(item) }),
    })
    .openapi(`OkList_${name}`);
