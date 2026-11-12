import {
  type AnyColumn,
  type SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type { SortOrder } from "~/lib/list-sort";
import type {
  PortalArticleSortBy,
  PortalCategorySortBy,
  PortalPageSortBy,
  PortalTemplateSortBy,
} from "./portal-content.schema";
import type {
  CreatePortalArticleService,
  CreatePortalCategoryService,
  CreatePortalPageService,
  CreatePortalTemplateService,
  DeletePortalArticleService,
  DeletePortalCategoryService,
  DeletePortalPageService,
  DeletePortalTemplateService,
  GetPortalArticleService,
  GetPortalCategoryService,
  GetPortalPageService,
  GetPortalTemplateService,
  ListPortalArticlesService,
  ListPortalCategoriesService,
  ListPortalPagesService,
  ListPortalTemplatesService,
  PortalArticleDto,
  PortalCategoryDto,
  PortalPageDetailDto,
  PortalPageDto,
  PortalTemplateDto,
  PublishPortalArticleService,
  PublishPortalPageService,
  UpdatePortalArticleService,
  UpdatePortalCategoryService,
  UpdatePortalPageService,
  UpdatePortalTemplateService,
} from "./portal-content.types";

/**
 * 可排序列 → 数据库列。
 *
 * sortBy 只接受 schema 里枚举过的值，这里再映射一次到真实列，
 * 保证任意字符串进不了 orderBy。
 */
const CATEGORY_SORT_COLUMNS: Record<PortalCategorySortBy, AnyColumn> = {
  createdAt: schema.portalCategory.createdAt,
  updatedAt: schema.portalCategory.updatedAt,
  name: schema.portalCategory.name,
  sortOrder: schema.portalCategory.sortOrder,
};

const ARTICLE_SORT_COLUMNS: Record<PortalArticleSortBy, AnyColumn> = {
  createdAt: schema.portalArticle.createdAt,
  updatedAt: schema.portalArticle.updatedAt,
  title: schema.portalArticle.title,
  publishTime: schema.portalArticle.publishTime,
};

const PAGE_SORT_COLUMNS: Record<PortalPageSortBy, AnyColumn> = {
  createdAt: schema.portalPage.createdAt,
  updatedAt: schema.portalPage.updatedAt,
  title: schema.portalPage.title,
  path: schema.portalPage.path,
};

const TEMPLATE_SORT_COLUMNS: Record<PortalTemplateSortBy, AnyColumn> = {
  createdAt: schema.portalTemplate.createdAt,
  updatedAt: schema.portalTemplate.updatedAt,
  name: schema.portalTemplate.name,
};

function orderBy<T extends string>(
  columns: Record<T, AnyColumn>,
  sortBy: T | undefined,
  sortOrder: SortOrder | undefined,
  fallback: AnyColumn,
) {
  const column = (sortBy ? columns[sortBy] : undefined) ?? fallback;
  return sortOrder === "desc" ? desc(column) : asc(column);
}

function toCategoryDto(row: typeof schema.portalCategory.$inferSelect): PortalCategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    status: row.status,
    sortOrder: row.sortOrder,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toArticleDto(
  row: typeof schema.portalArticle.$inferSelect,
  categoryIds: string[] = [],
): PortalArticleDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    coverImage: row.coverImage,
    status: row.status,
    isPinned: row.isPinned,
    publishTime: row.publishTime ? row.publishTime.toISOString() : null,
    attributes: row.attributes ?? null,
    tags: row.tags ?? null,
    templateId: row.templateId,
    categoryIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * 页面查询的列：不含 schema 本体（可能很大），只带两个由 SQL 算出的标志位。
 * 详情读取再额外选上 draftSchema / publishedSchema。
 */
const pageListColumns = {
  id: schema.portalPage.id,
  title: schema.portalPage.title,
  path: schema.portalPage.path,
  status: schema.portalPage.status,
  attributes: schema.portalPage.attributes,
  publishTime: schema.portalPage.publishTime,
  createdAt: schema.portalPage.createdAt,
  updatedAt: schema.portalPage.updatedAt,
  published: sql<boolean>`${schema.portalPage.publishedSchema} is not null`,
  unpublishedChanges: sql<boolean>`${schema.portalPage.draftSchema} is distinct from ${schema.portalPage.publishedSchema}`,
};

const pageDetailColumns = {
  ...pageListColumns,
  draftSchema: schema.portalPage.draftSchema,
  publishedSchema: schema.portalPage.publishedSchema,
};

type PageListRow = {
  id: string;
  title: string;
  path: string;
  status: "enabled" | "disabled";
  attributes: Record<string, string> | null;
  publishTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
  published: boolean;
  unpublishedChanges: boolean;
};

function toPageDto(row: PageListRow): PortalPageDto {
  return {
    id: row.id,
    title: row.title,
    path: row.path,
    status: row.status,
    attributes: row.attributes ?? null,
    publishTime: row.publishTime ? row.publishTime.toISOString() : null,
    published: Boolean(row.published),
    unpublishedChanges: Boolean(row.unpublishedChanges),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPageDetailDto(
  row: PageListRow & {
    draftSchema: schema.JsonValue | null;
    publishedSchema: schema.JsonValue | null;
  },
): PortalPageDetailDto {
  return {
    ...toPageDto(row),
    draftSchema: row.draftSchema ?? null,
    publishedSchema: row.publishedSchema ?? null,
  };
}

function toTemplateDto(row: typeof schema.portalTemplate.$inferSelect): PortalTemplateDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    schema: row.schema ?? null,
    config: row.config ?? null,
    status: row.status,
    isSystemDefault: row.isSystemDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** 批量取文章 → 分类 id 映射，供列表页一次性拼装 categoryIds。 */
async function getArticleCategoryMap(articleIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (articleIds.length === 0) return map;
  const rows = await getDb()
    .select({
      articleId: schema.portalArticleCategory.articleId,
      categoryId: schema.portalArticleCategory.categoryId,
    })
    .from(schema.portalArticleCategory)
    .where(inArray(schema.portalArticleCategory.articleId, articleIds));
  for (const row of rows) {
    const list = map.get(row.articleId);
    if (list) list.push(row.categoryId);
    else map.set(row.articleId, [row.categoryId]);
  }
  return map;
}

/* ------------------------------- 分类 ------------------------------- */

export const listPortalCategoriesService: ListPortalCategoriesService = async ({
  page,
  pageSize,
  keyword,
  name,
  slug,
  parentId,
  status,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where: SQL[] = [isNull(schema.portalCategory.deletedAt)];
  if (status) where.push(eq(schema.portalCategory.status, status));
  if (parentId) where.push(eq(schema.portalCategory.parentId, parentId));
  if (keyword) {
    const cond = or(
      like(schema.portalCategory.name, `%${keyword}%`),
      like(schema.portalCategory.slug, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  if (name) where.push(like(schema.portalCategory.name, `%${name}%`));
  if (slug) where.push(like(schema.portalCategory.slug, `%${slug}%`));
  if (createdFrom) where.push(gte(schema.portalCategory.createdAt, new Date(createdFrom)));
  if (createdTo) where.push(lte(schema.portalCategory.createdAt, new Date(createdTo)));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.portalCategory)
      .where(and(...where))
      .orderBy(
        orderBy(CATEGORY_SORT_COLUMNS, sortBy, sortOrder, schema.portalCategory.createdAt),
        asc(schema.portalCategory.id),
      )
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.portalCategory)
      .where(and(...where)),
  ]);
  return { items: rows.map(toCategoryDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getPortalCategoryService: GetPortalCategoryService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.portalCategory)
    .where(and(eq(schema.portalCategory.id, id), isNull(schema.portalCategory.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? toCategoryDto(row) : null;
};

async function assertCategorySlugAvailable(slug: string | undefined, excludeId?: string) {
  if (!slug) return;
  const db = getDb();
  const existing = await db
    .select({ id: schema.portalCategory.id })
    .from(schema.portalCategory)
    .where(and(eq(schema.portalCategory.slug, slug), isNull(schema.portalCategory.deletedAt)))
    .limit(1);
  if (existing[0] && existing[0].id !== excludeId) throw Errors.conflict("分类 URL 标识已存在");
}

async function assertCategoryNameAvailable(
  name: string,
  parentId: string | null,
  excludeId?: string,
) {
  const db = getDb();
  const existing = await db
    .select({ id: schema.portalCategory.id })
    .from(schema.portalCategory)
    .where(
      and(
        eq(schema.portalCategory.name, name),
        parentId === null
          ? isNull(schema.portalCategory.parentId)
          : eq(schema.portalCategory.parentId, parentId),
        isNull(schema.portalCategory.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0] && existing[0].id !== excludeId) {
    throw Errors.conflict("同一上级下已存在同名分类");
  }
}

export const createPortalCategoryService: CreatePortalCategoryService = async (input) => {
  const db = getDb();
  const parentId = input.parentId ?? null;
  if (parentId) {
    const parent = await getPortalCategoryService(parentId);
    if (!parent) throw Errors.notFound("上级分类不存在");
  }
  await assertCategorySlugAvailable(input.slug);
  await assertCategoryNameAvailable(input.name, parentId);
  const rows = await db
    .insert(schema.portalCategory)
    .values({
      name: input.name,
      slug: input.slug ?? null,
      parentId,
      status: input.status ?? "enabled",
      sortOrder: input.sortOrder ?? 0,
      description: input.description ?? null,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建分类失败");
  return toCategoryDto(row);
};

export const updatePortalCategoryService: UpdatePortalCategoryService = async (id, input) => {
  const db = getDb();
  const existing = await getPortalCategoryService(id);
  if (!existing) throw Errors.notFound("分类不存在");
  if (input.parentId === id) throw Errors.invalid("上级分类不能是自身");
  if (input.parentId) {
    const parent = await getPortalCategoryService(input.parentId);
    if (!parent) throw Errors.notFound("上级分类不存在");
  }
  if (input.slug !== undefined) await assertCategorySlugAvailable(input.slug, id);
  if (input.name !== undefined) {
    const parentId = input.parentId === undefined ? existing.parentId : input.parentId;
    await assertCategoryNameAvailable(input.name, parentId, id);
  }
  const patch: Partial<typeof schema.portalCategory.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.status !== undefined) patch.status = input.status;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  if (input.description !== undefined) patch.description = input.description;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.portalCategory).set(patch).where(eq(schema.portalCategory.id, id));
  }
  const refreshed = await getPortalCategoryService(id);
  if (!refreshed) throw Errors.notFound("分类不存在");
  return refreshed;
};

export const deletePortalCategoryService: DeletePortalCategoryService = async (id) => {
  const existing = await getPortalCategoryService(id);
  if (!existing) throw Errors.notFound("分类不存在");
  const children = await getDb()
    .select({ id: schema.portalCategory.id })
    .from(schema.portalCategory)
    .where(and(eq(schema.portalCategory.parentId, id), isNull(schema.portalCategory.deletedAt)))
    .limit(1);
  if (children[0]) throw Errors.conflict("存在下级分类，无法删除");
  await getDb()
    .update(schema.portalCategory)
    .set({ deletedAt: new Date() })
    .where(eq(schema.portalCategory.id, id));
  return { ok: true };
};

/* ------------------------------- 文章 ------------------------------- */

export const listPortalArticlesService: ListPortalArticlesService = async ({
  page,
  pageSize,
  keyword,
  title,
  status,
  categoryId,
  templateId,
  isPinned,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where: SQL[] = [isNull(schema.portalArticle.deletedAt)];
  if (status) where.push(eq(schema.portalArticle.status, status));
  if (templateId) where.push(eq(schema.portalArticle.templateId, templateId));
  if (isPinned !== undefined) where.push(eq(schema.portalArticle.isPinned, isPinned));
  if (keyword) {
    const cond = or(
      like(schema.portalArticle.title, `%${keyword}%`),
      like(schema.portalArticle.summary, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  if (title) where.push(like(schema.portalArticle.title, `%${title}%`));
  if (createdFrom) where.push(gte(schema.portalArticle.createdAt, new Date(createdFrom)));
  if (createdTo) where.push(lte(schema.portalArticle.createdAt, new Date(createdTo)));
  if (categoryId) {
    const related = getDb()
      .select({ articleId: schema.portalArticleCategory.articleId })
      .from(schema.portalArticleCategory)
      .where(eq(schema.portalArticleCategory.categoryId, categoryId));
    where.push(inArray(schema.portalArticle.id, related));
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.portalArticle)
      .where(and(...where))
      .orderBy(
        orderBy(ARTICLE_SORT_COLUMNS, sortBy, sortOrder, schema.portalArticle.createdAt),
        ...(!sortBy && !sortOrder ? [desc(schema.portalArticle.createdAt)] : []),
        asc(schema.portalArticle.id),
      )
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.portalArticle)
      .where(and(...where)),
  ]);
  const categoryMap = await getArticleCategoryMap(rows.map((row) => row.id));
  return {
    items: rows.map((row) => toArticleDto(row, categoryMap.get(row.id) ?? [])),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getPortalArticleService: GetPortalArticleService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.portalArticle)
    .where(and(eq(schema.portalArticle.id, id), isNull(schema.portalArticle.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const categoryMap = await getArticleCategoryMap([id]);
  return toArticleDto(row, categoryMap.get(id) ?? []);
};

async function assertArticleSlugAvailable(slug: string | undefined, excludeId?: string) {
  if (!slug) return;
  const existing = await getDb()
    .select({ id: schema.portalArticle.id })
    .from(schema.portalArticle)
    .where(and(eq(schema.portalArticle.slug, slug), isNull(schema.portalArticle.deletedAt)))
    .limit(1);
  if (existing[0] && existing[0].id !== excludeId) throw Errors.conflict("文章 URL 标识已存在");
}

async function replaceArticleCategories(articleId: string, categoryIds: string[]) {
  const db = getDb();
  await db
    .delete(schema.portalArticleCategory)
    .where(eq(schema.portalArticleCategory.articleId, articleId));
  const unique = [...new Set(categoryIds)];
  if (unique.length > 0) {
    await db
      .insert(schema.portalArticleCategory)
      .values(unique.map((categoryId) => ({ articleId, categoryId })));
  }
}

export const createPortalArticleService: CreatePortalArticleService = async (input) => {
  const db = getDb();
  await assertArticleSlugAvailable(input.slug);
  const rows = await db
    .insert(schema.portalArticle)
    .values({
      title: input.title,
      slug: input.slug ?? null,
      summary: input.summary ?? null,
      content: input.content,
      coverImage: input.coverImage ?? null,
      status: input.status ?? "draft",
      isPinned: input.isPinned ?? false,
      publishTime: input.publishTime ? new Date(input.publishTime) : null,
      attributes: input.attributes ?? null,
      tags: input.tags ?? null,
      templateId: input.templateId ?? null,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建文章失败");
  if (input.categoryIds && input.categoryIds.length > 0) {
    await replaceArticleCategories(row.id, input.categoryIds);
  }
  const created = await getPortalArticleService(row.id);
  if (!created) throw Errors.internal("创建文章失败");
  return created;
};

export const updatePortalArticleService: UpdatePortalArticleService = async (id, input) => {
  const db = getDb();
  const existing = await getPortalArticleService(id);
  if (!existing) throw Errors.notFound("文章不存在");
  if (input.slug !== undefined) await assertArticleSlugAvailable(input.slug, id);
  const patch: Partial<typeof schema.portalArticle.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.content !== undefined) patch.content = input.content;
  if (input.coverImage !== undefined) patch.coverImage = input.coverImage;
  if (input.status !== undefined) patch.status = input.status;
  if (input.isPinned !== undefined) patch.isPinned = input.isPinned;
  if (input.publishTime !== undefined) {
    patch.publishTime = input.publishTime ? new Date(input.publishTime) : null;
  }
  if (input.attributes !== undefined) patch.attributes = input.attributes;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.templateId !== undefined) patch.templateId = input.templateId;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.portalArticle).set(patch).where(eq(schema.portalArticle.id, id));
  }
  if (input.categoryIds !== undefined) {
    await replaceArticleCategories(id, input.categoryIds);
  }
  const refreshed = await getPortalArticleService(id);
  if (!refreshed) throw Errors.notFound("文章不存在");
  return refreshed;
};

export const publishPortalArticleService: PublishPortalArticleService = async (id) => {
  const db = getDb();
  const existing = await getPortalArticleService(id);
  if (!existing) throw Errors.notFound("文章不存在");
  await db
    .update(schema.portalArticle)
    .set({ status: "published", publishTime: new Date() })
    .where(eq(schema.portalArticle.id, id));
  const refreshed = await getPortalArticleService(id);
  if (!refreshed) throw Errors.notFound("文章不存在");
  return refreshed;
};

export const deletePortalArticleService: DeletePortalArticleService = async (id) => {
  const existing = await getPortalArticleService(id);
  if (!existing) throw Errors.notFound("文章不存在");
  await getDb()
    .update(schema.portalArticle)
    .set({ deletedAt: new Date() })
    .where(eq(schema.portalArticle.id, id));
  return { ok: true };
};

/* ------------------------------- 页面 ------------------------------- */

export const listPortalPagesService: ListPortalPagesService = async ({
  page,
  pageSize,
  keyword,
  title,
  path,
  status,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where: SQL[] = [isNull(schema.portalPage.deletedAt)];
  if (status) where.push(eq(schema.portalPage.status, status));
  if (keyword) {
    const cond = or(
      like(schema.portalPage.title, `%${keyword}%`),
      like(schema.portalPage.path, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  if (title) where.push(like(schema.portalPage.title, `%${title}%`));
  if (path) where.push(like(schema.portalPage.path, `%${path}%`));
  if (createdFrom) where.push(gte(schema.portalPage.createdAt, new Date(createdFrom)));
  if (createdTo) where.push(lte(schema.portalPage.createdAt, new Date(createdTo)));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select(pageListColumns)
      .from(schema.portalPage)
      .where(and(...where))
      .orderBy(
        orderBy(PAGE_SORT_COLUMNS, sortBy, sortOrder, schema.portalPage.createdAt),
        ...(!sortBy && !sortOrder ? [desc(schema.portalPage.createdAt)] : []),
        asc(schema.portalPage.id),
      )
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.portalPage)
      .where(and(...where)),
  ]);
  return { items: rows.map(toPageDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getPortalPageService: GetPortalPageService = async (id) => {
  const rows = await getDb()
    .select(pageDetailColumns)
    .from(schema.portalPage)
    .where(and(eq(schema.portalPage.id, id), isNull(schema.portalPage.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? toPageDetailDto(row) : null;
};

async function assertPagePathAvailable(path: string, excludeId?: string) {
  const existing = await getDb()
    .select({ id: schema.portalPage.id })
    .from(schema.portalPage)
    .where(and(eq(schema.portalPage.path, path), isNull(schema.portalPage.deletedAt)))
    .limit(1);
  if (existing[0] && existing[0].id !== excludeId) throw Errors.conflict("页面路径已存在");
}

export const createPortalPageService: CreatePortalPageService = async (input) => {
  const db = getDb();
  await assertPagePathAvailable(input.path);
  let draftSchema: schema.JsonValue | null = null;
  if (input.copyFromId) {
    const source = await getPortalPageService(input.copyFromId);
    if (!source) throw Errors.notFound("复制来源页面不存在");
    draftSchema = source.draftSchema ?? source.publishedSchema;
  }
  const inserted = await db
    .insert(schema.portalPage)
    .values({
      title: input.title,
      path: input.path,
      status: input.status ?? "enabled",
      attributes: input.attributes ?? null,
      publishTime: input.publishTime ? new Date(input.publishTime) : null,
      draftSchema,
    })
    .returning({ id: schema.portalPage.id });
  const id = inserted[0]?.id;
  if (!id) throw Errors.internal("创建页面失败");
  return reloadPage(id);
};

async function reloadPage(id: string): Promise<PortalPageDto> {
  const row = await getPortalPageService(id);
  if (!row) throw Errors.notFound("页面不存在");
  const { draftSchema: _draft, publishedSchema: _published, ...dto } = row;
  return dto;
}

export const updatePortalPageService: UpdatePortalPageService = async (id, input) => {
  const db = getDb();
  const existing = await getPortalPageService(id);
  if (!existing) throw Errors.notFound("页面不存在");
  if (input.path !== undefined) await assertPagePathAvailable(input.path, id);
  const patch: Partial<typeof schema.portalPage.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.path !== undefined) patch.path = input.path;
  if (input.status !== undefined) patch.status = input.status;
  if (input.attributes !== undefined) patch.attributes = input.attributes;
  if (input.publishTime !== undefined) {
    patch.publishTime = input.publishTime ? new Date(input.publishTime) : null;
  }
  if (input.draftSchema !== undefined) patch.draftSchema = input.draftSchema;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.portalPage).set(patch).where(eq(schema.portalPage.id, id));
  }
  return reloadPage(id);
};

/** 发布：把草稿拷贝为已发布版本，并记录发布时间。没有草稿时拒绝。 */
export const publishPortalPageService: PublishPortalPageService = async (id) => {
  const existing = await getPortalPageService(id);
  if (!existing) throw Errors.notFound("页面不存在");
  if (!existing.draftSchema) throw Errors.invalid("页面还没有内容，请先在设计器里保存");
  await getDb()
    .update(schema.portalPage)
    .set({ publishedSchema: existing.draftSchema, publishTime: new Date() })
    .where(eq(schema.portalPage.id, id));
  return reloadPage(id);
};

export const deletePortalPageService: DeletePortalPageService = async (id) => {
  const existing = await getPortalPageService(id);
  if (!existing) throw Errors.notFound("页面不存在");
  await getDb()
    .update(schema.portalPage)
    .set({ deletedAt: new Date() })
    .where(eq(schema.portalPage.id, id));
  return { ok: true };
};

/* ------------------------------- 模板 ------------------------------- */

export const listPortalTemplatesService: ListPortalTemplatesService = async ({
  page,
  pageSize,
  keyword,
  name,
  type,
  status,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where: SQL[] = [isNull(schema.portalTemplate.deletedAt)];
  if (type) where.push(eq(schema.portalTemplate.type, type));
  if (status) where.push(eq(schema.portalTemplate.status, status));
  if (keyword) {
    const cond = or(
      like(schema.portalTemplate.name, `%${keyword}%`),
      like(schema.portalTemplate.description, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  if (name) where.push(like(schema.portalTemplate.name, `%${name}%`));
  if (createdFrom) where.push(gte(schema.portalTemplate.createdAt, new Date(createdFrom)));
  if (createdTo) where.push(lte(schema.portalTemplate.createdAt, new Date(createdTo)));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.portalTemplate)
      .where(and(...where))
      .orderBy(
        orderBy(TEMPLATE_SORT_COLUMNS, sortBy, sortOrder, schema.portalTemplate.createdAt),
        ...(!sortBy && !sortOrder ? [desc(schema.portalTemplate.createdAt)] : []),
        asc(schema.portalTemplate.id),
      )
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.portalTemplate)
      .where(and(...where)),
  ]);
  return { items: rows.map(toTemplateDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getPortalTemplateService: GetPortalTemplateService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.portalTemplate)
    .where(and(eq(schema.portalTemplate.id, id), isNull(schema.portalTemplate.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? toTemplateDto(row) : null;
};

async function assertTemplateNameAvailable(
  type: "article" | "page",
  name: string,
  excludeId?: string,
) {
  const existing = await getDb()
    .select({ id: schema.portalTemplate.id })
    .from(schema.portalTemplate)
    .where(
      and(
        eq(schema.portalTemplate.type, type),
        eq(schema.portalTemplate.name, name),
        isNull(schema.portalTemplate.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0] && existing[0].id !== excludeId) {
    throw Errors.conflict("同一类型下已存在同名模板");
  }
}

export const createPortalTemplateService: CreatePortalTemplateService = async (input) => {
  const db = getDb();
  await assertTemplateNameAvailable(input.type, input.name);
  const rows = await db
    .insert(schema.portalTemplate)
    .values({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      schema: input.schema ?? null,
      config: input.config ?? null,
      status: input.status ?? "enabled",
      isSystemDefault: input.isSystemDefault ?? false,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建模板失败");
  return toTemplateDto(row);
};

export const updatePortalTemplateService: UpdatePortalTemplateService = async (id, input) => {
  const db = getDb();
  const existing = await getPortalTemplateService(id);
  if (!existing) throw Errors.notFound("模板不存在");
  if (input.name !== undefined) await assertTemplateNameAvailable(existing.type, input.name, id);
  const patch: Partial<typeof schema.portalTemplate.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.schema !== undefined) patch.schema = input.schema;
  if (input.config !== undefined) patch.config = input.config;
  if (input.status !== undefined) patch.status = input.status;
  if (input.isSystemDefault !== undefined) patch.isSystemDefault = input.isSystemDefault;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.portalTemplate).set(patch).where(eq(schema.portalTemplate.id, id));
  }
  const refreshed = await getPortalTemplateService(id);
  if (!refreshed) throw Errors.notFound("模板不存在");
  return refreshed;
};

export const deletePortalTemplateService: DeletePortalTemplateService = async (id) => {
  const existing = await getPortalTemplateService(id);
  if (!existing) throw Errors.notFound("模板不存在");
  if (existing.isSystemDefault) throw Errors.forbidden("系统默认模板不可删除");
  await getDb()
    .update(schema.portalTemplate)
    .set({ deletedAt: new Date() })
    .where(eq(schema.portalTemplate.id, id));
  return { ok: true };
};
