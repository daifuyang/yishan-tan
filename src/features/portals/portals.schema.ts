import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const portalThemeModeSchema = z.enum(["light", "dark"]);

export type PortalThemeMode = z.infer<typeof portalThemeModeSchema>;

const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const trimmedText = (max: number, label: string) =>
  z.string().trim().min(1, `${label}不能为空`).max(max, `${label}过长`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

/**
 * domain 允许空、可省略 scheme 的 host（yishan.com / portal.example.com / sub.example.co.uk）。
 * 不强制 http(s) 前缀，前端展示与后端读取都不依赖 scheme。
 */
const domainSchema = z
  .string()
  .trim()
  .max(253, "域名过长")
  .regex(/^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?:\.[a-zA-Z0-9-]{1,63})+$/, "域名格式不合法")
  .optional()
  .or(z.literal("").transform(() => undefined));

const themePrimarySchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_PATTERN, "主题色格式不合法（需 #RGB 或 #RRGGBB）")
  .optional()
  .or(z.literal("").transform(() => undefined));

const logoUrlSchema = z
  .string()
  .trim()
  .max(500, "Logo URL 过长")
  .optional()
  .or(z.literal("").transform(() => undefined));

const baseObject = z.object({
  name: trimmedText(50, "名称"),
  code: z
    .string()
    .trim()
    .min(1, "编码不能为空")
    .max(50, "编码过长")
    .regex(CODE_PATTERN, "编码仅允许小写字母、数字、短横线，且首尾必须是字母或数字"),
  domain: domainSchema,
  logoUrl: logoUrlSchema,
  themePrimary: themePrimarySchema,
  themeMode: portalThemeModeSchema.default("light"),
  description: optionalText(500),
  isDefault: z.boolean().optional(),
  status: statusSchema.default("enabled"),
});

export const createPortalSchema = baseObject;

export const updatePortalSchema = baseObject.partial();

export const portalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  isDefault: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => {
      if (v === "true") return true;
      if (v === "false") return false;
      return v;
    }),
  status: statusSchema.optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
});

export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type UpdatePortalInput = z.infer<typeof updatePortalSchema>;
export type PortalListQuery = z.infer<typeof portalListQuerySchema>;
