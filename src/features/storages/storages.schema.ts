import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const storageDriverSchema = z.enum([
  "local",
  "aliyun-oss",
  "tencent-cos",
  "aws-s3",
  "qiniu",
  "minio",
]);

export type StorageDriver = z.infer<typeof storageDriverSchema>;

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
 * 每个 driver 的 config 子 schema。service 层做二次校验；
 * 前端表单也按 driver 切换以便显示对应字段。
 */
export const localDriverConfigSchema = z.object({
  dir: z.string().trim().default("public/uploads"),
  prefix: z.string().trim().optional(),
  publicBaseUrl: z.string().trim().optional(),
});

export const aliyunOssDriverConfigSchema = z.object({
  region: trimmedText(64, "Region"),
  bucket: trimmedText(128, "Bucket"),
  accessKeyId: trimmedText(128, "AccessKeyId"),
  accessKeySecret: trimmedText(256, "AccessKeySecret"),
  endpoint: optionalText(256),
  cdnDomain: optionalText(256),
  prefix: optionalText(256),
});

export const tencentCosDriverConfigSchema = z.object({
  region: trimmedText(64, "Region"),
  bucket: trimmedText(128, "Bucket"),
  secretId: trimmedText(128, "SecretId"),
  secretKey: trimmedText(256, "SecretKey"),
  appId: trimmedText(32, "AppId").optional(),
  endpoint: optionalText(256).optional(),
  cdnDomain: optionalText(256).optional(),
  prefix: optionalText(256).optional(),
});

export const awsS3DriverConfigSchema = z.object({
  region: trimmedText(64, "Region"),
  bucket: trimmedText(128, "Bucket"),
  accessKeyId: trimmedText(128, "AccessKeyId"),
  secretAccessKey: trimmedText(256, "SecretAccessKey"),
  endpoint: optionalText(256).optional(),
  cdnDomain: optionalText(256).optional(),
  prefix: optionalText(256).optional(),
});

export const qiniuDriverConfigSchema = z.object({
  bucket: trimmedText(128, "Bucket"),
  accessKey: trimmedText(128, "AccessKey"),
  secretKey: trimmedText(256, "SecretKey"),
  endpoint: optionalText(256).optional(),
  cdnDomain: optionalText(256).optional(),
  prefix: optionalText(256).optional(),
});

export const minioDriverConfigSchema = z.object({
  region: optionalText(64),
  bucket: trimmedText(128, "Bucket"),
  accessKey: trimmedText(128, "AccessKey"),
  secretAccessKey: trimmedText(256, "SecretAccessKey"),
  endpoint: trimmedText(256, "Endpoint"),
  publicBaseUrl: optionalText(256),
  prefix: optionalText(256).optional(),
});

export const driverConfigSchemaMap: Record<StorageDriver, z.ZodTypeAny> = {
  local: localDriverConfigSchema,
  "aliyun-oss": aliyunOssDriverConfigSchema,
  "tencent-cos": tencentCosDriverConfigSchema,
  "aws-s3": awsS3DriverConfigSchema,
  qiniu: qiniuDriverConfigSchema,
  minio: minioDriverConfigSchema,
};

const baseObject = z.object({
  name: trimmedText(50, "名称"),
  driver: storageDriverSchema,
  isDefault: z.boolean().optional(),
  description: optionalText(500),
  status: statusSchema.default("enabled"),
});

/**
 * 创建输入：config 用 z.unknown()，待 service 按 driver 二次校验并解析，
 * 前端 UI 可直接复用 schema 来切 driver 子表单。
 */
export const createStorageSchema = baseObject.extend({
  config: z.unknown(),
});

export const updateStorageSchema = baseObject.partial().extend({
  config: z.unknown().optional(),
});

export const storageListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  driver: storageDriverSchema.optional(),
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

export type CreateStorageInput = z.infer<typeof createStorageSchema>;
export type UpdateStorageInput = z.infer<typeof updateStorageSchema>;
export type StorageListQuery = z.infer<typeof storageListQuerySchema>;
