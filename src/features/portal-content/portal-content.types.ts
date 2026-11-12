import type { JsonValue } from "~/../db/schema";
import type {
  PortalArticleListQuery,
  PortalCategoryListQuery,
  PortalPageListQuery,
  PortalTemplateListQuery,
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

export type PortalPageDto = {
  id: string;
  title: string;
  path: string;
  content: string;
  status: PortalContentStatus;
  attributes: Record<string, string> | null;
  publishTime: string | null;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
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

export type GetPortalPageService = (id: string) => Promise<PortalPageDto | null>;

export type CreatePortalPageService = (input: {
  title: string;
  path: string;
  content: string;
  status?: PortalContentStatus;
  attributes?: Record<string, string>;
  publishTime?: string;
  templateId?: string | null;
}) => Promise<PortalPageDto>;

export type UpdatePortalPageService = (
  id: string,
  input: {
    title?: string;
    path?: string;
    content?: string;
    status?: PortalContentStatus;
    attributes?: Record<string, string>;
    publishTime?: string;
    templateId?: string | null;
  },
) => Promise<PortalPageDto>;

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
