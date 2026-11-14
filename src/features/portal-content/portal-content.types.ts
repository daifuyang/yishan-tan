import type { JsonValue } from "~/../db/schema";
import type {
  PortalArticleListQuery,
  PortalCategoryListQuery,
  PortalPageListQuery,
  PortalTemplateListQuery,
  SavePortalPageDesignInput,
  UpdatePortalSiteLayoutInput,
} from "./portal-content.schema";

export type PortalContentStatus = "enabled" | "disabled";
export type PortalArticleStatus = "draft" | "published";
export type PortalTemplateType = "article" | "page";

export type PortalCategoryDto = {
  id: string;
  name: string;
  slug: string | null;
  parentId: string | null;
  status: PortalContentStatus;
  sortOrder: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PortalArticleDto = {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  content: string;
  coverImage: string | null;
  status: PortalArticleStatus;
  isPinned: boolean;
  publishTime: string | null;
  attributes: Record<string, string> | null;
  tags: string[] | null;
  templateId: string | null;
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** 页面（列表 / 创建 / 更新返回）。不含 schema 本体，避免列表带上大 JSON。 */
export type PortalPageDto = {
  id: string;
  title: string;
  path: string;
  status: PortalContentStatus;
  attributes: Record<string, string> | null;
  publishTime: string | null;
  /** 是否有已发布版本（前台是否可见内容）。 */
  published: boolean;
  /** 草稿与已发布版本不一致（有未发布的改动）。 */
  unpublishedChanges: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 页面详情：多带草稿与已发布的 PageSchema。 */
export type PortalPageDetailDto = PortalPageDto & {
  draftSchema: JsonValue | null;
  publishedSchema: JsonValue | null;
};

export type PortalTemplateDto = {
  id: string;
  name: string;
  description: string | null;
  type: PortalTemplateType;
  schema: JsonValue | null;
  config: JsonValue | null;
  status: PortalContentStatus;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListPortalCategoriesService = (
  input: PortalCategoryListQuery,
) => Promise<{ items: PortalCategoryDto[]; total: number }>;

export type GetPortalCategoryService = (id: string) => Promise<PortalCategoryDto | null>;

export type CreatePortalCategoryService = (input: {
  name: string;
  slug?: string;
  parentId?: string | null;
  status?: PortalContentStatus;
  sortOrder?: number;
  description?: string;
}) => Promise<PortalCategoryDto>;

export type UpdatePortalCategoryService = (
  id: string,
  input: {
    name?: string;
    slug?: string;
    parentId?: string | null;
    status?: PortalContentStatus;
    sortOrder?: number;
    description?: string;
  },
) => Promise<PortalCategoryDto>;

export type DeletePortalCategoryService = (id: string) => Promise<{ ok: true }>;

export type ListPortalArticlesService = (
  input: PortalArticleListQuery,
) => Promise<{ items: PortalArticleDto[]; total: number }>;

export type GetPortalArticleService = (id: string) => Promise<PortalArticleDto | null>;

export type CreatePortalArticleService = (input: {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  coverImage?: string;
  status?: PortalArticleStatus;
  isPinned?: boolean;
  publishTime?: string;
  attributes?: Record<string, string>;
  tags?: string[];
  templateId?: string | null;
  categoryIds?: string[];
}) => Promise<PortalArticleDto>;

export type UpdatePortalArticleService = (
  id: string,
  input: {
    title?: string;
    slug?: string;
    summary?: string;
    content?: string;
    coverImage?: string;
    status?: PortalArticleStatus;
    isPinned?: boolean;
    publishTime?: string;
    attributes?: Record<string, string>;
    tags?: string[];
    templateId?: string | null;
    categoryIds?: string[];
  },
) => Promise<PortalArticleDto>;

export type PublishPortalArticleService = (id: string) => Promise<PortalArticleDto>;

export type DeletePortalArticleService = (id: string) => Promise<{ ok: true }>;

export type ListPortalPagesService = (
  input: PortalPageListQuery,
) => Promise<{ items: PortalPageDto[]; total: number }>;

export type GetPortalPageService = (id: string) => Promise<PortalPageDetailDto | null>;

export type CreatePortalPageService = (input: {
  title: string;
  path: string;
  status?: PortalContentStatus;
  attributes?: Record<string, string>;
  publishTime?: string;
  copyFromId?: string;
}) => Promise<PortalPageDto>;

export type UpdatePortalPageService = (
  id: string,
  input: {
    title?: string;
    path?: string;
    status?: PortalContentStatus;
    attributes?: Record<string, string>;
    publishTime?: string;
    draftSchema?: JsonValue;
  },
) => Promise<PortalPageDto>;

export type PublishPortalPageService = (id: string) => Promise<PortalPageDto>;

export type DeletePortalPageService = (id: string) => Promise<{ ok: true }>;

export type ListPortalTemplatesService = (
  input: PortalTemplateListQuery,
) => Promise<{ items: PortalTemplateDto[]; total: number }>;

export type GetPortalTemplateService = (id: string) => Promise<PortalTemplateDto | null>;

export type CreatePortalTemplateService = (input: {
  name: string;
  description?: string;
  type: PortalTemplateType;
  schema?: JsonValue;
  config?: JsonValue;
  status?: PortalContentStatus;
  isSystemDefault?: boolean;
}) => Promise<PortalTemplateDto>;

export type UpdatePortalTemplateService = (
  id: string,
  input: {
    name?: string;
    description?: string;
    schema?: JsonValue;
    config?: JsonValue;
    status?: PortalContentStatus;
    isSystemDefault?: boolean;
  },
) => Promise<PortalTemplateDto>;

export type DeletePortalTemplateService = (id: string) => Promise<{ ok: true }>;

/* ---------------------------- 全站公共布局 ---------------------------- */

/**
 * 全站公共布局（页头 / 页脚）。每一块是节点数组（NodeSchema[]）。
 *
 * `initialized` 为 false 表示库里还没有这条记录：内容都是空的，编辑器此时用默认页头起步，
 * 第一次保存时才真正落库。`version` 是乐观锁，写入一次 +1。
 */
export type PortalSiteLayoutDto = {
  key: string;
  initialized: boolean;
  version: number;
  draftHeader: JsonValue[];
  /** 从未发布过为 null；前台只读已发布版本。 */
  publishedHeader: JsonValue[] | null;
  draftFooter: JsonValue[];
  publishedFooter: JsonValue[] | null;
  /** 草稿与已发布版本不一致（有未发布的改动）。 */
  unpublishedChanges: boolean;
  publishTime: string | null;
  updatedAt: string | null;
};

export type GetPortalSiteLayoutService = () => Promise<PortalSiteLayoutDto>;

export type UpdatePortalSiteLayoutService = (
  input: UpdatePortalSiteLayoutInput,
  options?: { operatorId?: string },
) => Promise<PortalSiteLayoutDto>;

export type PublishPortalSiteLayoutService = (options?: {
  operatorId?: string;
}) => Promise<PortalSiteLayoutDto>;

export type SavePortalPageDesignResult = {
  page: PortalPageDto;
  layout: PortalSiteLayoutDto;
  /** 这次保存是否写了全站公共布局（即「影响所有页面」的那类保存）。 */
  layoutChanged: boolean;
};

export type SavePortalPageDesignService = (
  input: SavePortalPageDesignInput,
  options?: { operatorId?: string },
) => Promise<SavePortalPageDesignResult>;

/** 组合后的页面（公共页头 + 页面正文 + 公共页脚），编辑器 / 预览 / 正式渲染用的就是它。 */
export type PortalPageRenderDto = {
  pageId: string;
  mode: "draft" | "published";
  schema: JsonValue;
  layoutVersion: number;
};

export type GetPortalPageRenderService = (
  id: string,
  mode: "draft" | "published",
) => Promise<PortalPageRenderDto | null>;
