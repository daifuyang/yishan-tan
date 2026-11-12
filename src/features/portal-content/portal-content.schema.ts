import { z } from "zod";

import { sortOrderSchema } from "~/lib/list-sort";

export const portalContentStatusSchema = z.enum(["enabled", "disabled"]);
export const portalArticleStatusSchema = z.enum(["draft", "published"]);
export const portalTemplateTypeSchema = z.enum(["article", "page"]);

/** 自定义属性：键值对集合，落库为 jsonb。 */
export const portalAttributesSchema = z.record(z.string().min(1).max(64), z.string().max(500));

/**
 * 模板 json 字段的取值：可序列化的 JSON 值。
 *
 * 早期这里只允许标量（TanStack server fn 不接受 `unknown`），但低代码编辑器的
 * PageSchema 是**嵌套**结构（componentsTree 是对象树），所以放宽成递归 JSON。
 * 递归类型是具名的联合而不是 `unknown` —— server fn 的序列化校验只拒函数，
 * 具名联合能过类型级检查。
 */
export type PortalJsonValue =
  | string
  | number
  | boolean
  | null
  | PortalJsonValue[]
  | { [key: string]: PortalJsonValue };

const portalJsonValueSchema: z.ZodType<PortalJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(portalJsonValueSchema),
    z.record(z.string(), portalJsonValueSchema),
  ]),
);

/** 模板的 json 字段（schema / config），落库为 jsonb。 */
export const portalTemplateJsonSchema = z.record(z.string(), portalJsonValueSchema);

/**
 * 低代码页面结构（PageSchema）的**最小形状**校验。
 *
 * 不依赖 lowcode-next 引擎（服务器侧不该为了校验而把引擎拖进依赖图）：
 * 只看得到的那几个关键字段 —— `version` 是字符串、`componentsTree` 是对象。
 * 引擎自己的 `parsePageSchema` 在浏览器侧做完整校验。
 */
function checkPageSchemaLike(value: unknown, ctx: z.RefinementCtx, path: string): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    ctx.addIssue({ code: "custom", message: `${path} 必须是对象`, path: [path] });
    return;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== "string" || candidate.version.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: `${path} 缺少页面版本号（version）`,
      path: [path, "version"],
    });
  }
  const tree = candidate.componentsTree;
  if (tree === null || typeof tree !== "object" || Array.isArray(tree)) {
    ctx.addIssue({
      code: "custom",
      message: `${path} 缺少页面结构（componentsTree）`,
      path: [path, "componentsTree"],
    });
  }
}

/** 标签数组，落库为 jsonb。 */
export const portalTagsSchema = z.array(z.string().min(1).max(50)).max(20);

/* ------------------------------- 分类 ------------------------------- */

export const createPortalCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().trim().min(1).max(100).optional(),
  parentId: z.string().uuid().nullish(),
  status: portalContentStatusSchema.default("enabled"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  description: z.string().max(255).optional(),
});

export const updatePortalCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  parentId: z.string().uuid().nullish(),
  status: portalContentStatusSchema.optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  description: z.string().max(255).optional(),
});

export const portalCategoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  name: z.string().trim().optional(),
  slug: z.string().trim().optional(),
  parentId: z.string().uuid().optional(),
  status: portalContentStatusSchema.optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）。 */
  sortBy: z.enum(["createdAt", "updatedAt", "name", "sortOrder"]).optional(),
  /** 排序方向；缺省沿用列表默认顺序。 */
  sortOrder: sortOrderSchema.optional(),
});

/* ------------------------------- 文章 ------------------------------- */

export const createPortalArticleSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().trim().min(1).max(200).optional(),
  summary: z.string().max(500).optional(),
  content: z.string(),
  coverImage: z.string().trim().max(500).optional(),
  status: portalArticleStatusSchema.default("draft"),
  isPinned: z.boolean().default(false),
  publishTime: z.string().datetime().optional(),
  attributes: portalAttributesSchema.optional(),
  tags: portalTagsSchema.optional(),
  templateId: z.string().uuid().nullish(),
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
});

export const updatePortalArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  summary: z.string().max(500).optional(),
  content: z.string().optional(),
  coverImage: z.string().trim().max(500).optional(),
  status: portalArticleStatusSchema.optional(),
  isPinned: z.boolean().optional(),
  publishTime: z.string().datetime().optional(),
  attributes: portalAttributesSchema.optional(),
  tags: portalTagsSchema.optional(),
  templateId: z.string().uuid().nullish(),
  categoryIds: z.array(z.string().uuid()).max(50).optional(),
});

export const portalArticleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  title: z.string().trim().optional(),
  status: portalArticleStatusSchema.optional(),
  categoryId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  isPinned: z.coerce.boolean().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）。 */
  sortBy: z.enum(["createdAt", "updatedAt", "title", "publishTime"]).optional(),
  /** 排序方向；缺省沿用列表默认顺序（创建时间倒序）。 */
  sortOrder: sortOrderSchema.optional(),
});

/* ------------------------------- 页面 ------------------------------- */

export const createPortalPageSchema = z.object({
  title: z.string().min(1).max(200),
  path: z.string().trim().min(1).max(255),
  content: z.string(),
  status: portalContentStatusSchema.default("enabled"),
  attributes: portalAttributesSchema.optional(),
  publishTime: z.string().datetime().optional(),
  templateId: z.string().uuid().nullish(),
});

export const updatePortalPageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  path: z.string().trim().min(1).max(255).optional(),
  content: z.string().optional(),
  status: portalContentStatusSchema.optional(),
  attributes: portalAttributesSchema.optional(),
  publishTime: z.string().datetime().optional(),
  templateId: z.string().uuid().nullish(),
});

export const portalPageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  title: z.string().trim().optional(),
  path: z.string().trim().optional(),
  status: portalContentStatusSchema.optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）。 */
  sortBy: z.enum(["createdAt", "updatedAt", "title", "path"]).optional(),
  /** 排序方向；缺省沿用列表默认顺序（创建时间倒序）。 */
  sortOrder: sortOrderSchema.optional(),
});

/* ------------------------------- 模板 ------------------------------- */

export const createPortalTemplateSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(255).optional(),
    type: portalTemplateTypeSchema,
    schema: portalTemplateJsonSchema.optional(),
    config: portalTemplateJsonSchema.optional(),
    status: portalContentStatusSchema.default("enabled"),
    isSystemDefault: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.schema !== undefined) checkPageSchemaLike(value.schema, ctx, "schema");
  });

export const updatePortalTemplateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(255).optional(),
    schema: portalTemplateJsonSchema.optional(),
    config: portalTemplateJsonSchema.optional(),
    status: portalContentStatusSchema.optional(),
    isSystemDefault: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.schema !== undefined) checkPageSchemaLike(value.schema, ctx, "schema");
  });

export const portalTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  name: z.string().trim().optional(),
  type: portalTemplateTypeSchema.optional(),
  status: portalContentStatusSchema.optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）。 */
  sortBy: z.enum(["createdAt", "updatedAt", "name"]).optional(),
  /** 排序方向；缺省沿用列表默认顺序（创建时间倒序）。 */
  sortOrder: sortOrderSchema.optional(),
});

export type CreatePortalCategoryInput = z.infer<typeof createPortalCategorySchema>;
export type UpdatePortalCategoryInput = z.infer<typeof updatePortalCategorySchema>;
export type PortalCategoryListQuery = z.infer<typeof portalCategoryListQuerySchema>;
export type PortalCategorySortBy = NonNullable<PortalCategoryListQuery["sortBy"]>;
export type CreatePortalArticleInput = z.infer<typeof createPortalArticleSchema>;
export type UpdatePortalArticleInput = z.infer<typeof updatePortalArticleSchema>;
export type PortalArticleListQuery = z.infer<typeof portalArticleListQuerySchema>;
export type PortalArticleSortBy = NonNullable<PortalArticleListQuery["sortBy"]>;
export type CreatePortalPageInput = z.infer<typeof createPortalPageSchema>;
export type UpdatePortalPageInput = z.infer<typeof updatePortalPageSchema>;
export type PortalPageListQuery = z.infer<typeof portalPageListQuerySchema>;
export type PortalPageSortBy = NonNullable<PortalPageListQuery["sortBy"]>;
export type CreatePortalTemplateInput = z.infer<typeof createPortalTemplateSchema>;
export type UpdatePortalTemplateInput = z.infer<typeof updatePortalTemplateSchema>;
export type PortalTemplateListQuery = z.infer<typeof portalTemplateListQuerySchema>;
export type PortalTemplateSortBy = NonNullable<PortalTemplateListQuery["sortBy"]>;
