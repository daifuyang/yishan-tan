import { describe, expect, it } from "vitest";
import {
  aliyunOssDriverConfigSchema,
  awsS3DriverConfigSchema,
  createStorageSchema,
  driverConfigSchemaMap,
  localDriverConfigSchema,
  minioDriverConfigSchema,
  qiniuDriverConfigSchema,
  storageDriverSchema,
  storageListQuerySchema,
  tencentCosDriverConfigSchema,
  updateStorageSchema,
} from "~/features/storages/storages.schema";

describe("storages.schema", () => {
  describe("storageDriverSchema", () => {
    it("accepts every supported driver", () => {
      for (const v of ["local", "aliyun-oss", "tencent-cos", "aws-s3", "qiniu", "minio"]) {
        expect(storageDriverSchema.parse(v)).toBe(v);
      }
    });

    it("rejects unknown driver", () => {
      expect(() => storageDriverSchema.parse("azure")).toThrow();
    });
  });

  describe("localDriverConfigSchema", () => {
    it("defaults dir to public/uploads", () => {
      const parsed = localDriverConfigSchema.parse({});
      expect(parsed.dir).toBe("public/uploads");
    });

    it("accepts overrides", () => {
      const parsed = localDriverConfigSchema.parse({
        dir: "uploads",
        prefix: "files",
        publicBaseUrl: "https://cdn.example.com",
      });
      expect(parsed).toEqual({
        dir: "uploads",
        prefix: "files",
        publicBaseUrl: "https://cdn.example.com",
      });
    });
  });

  describe("aliyunOssDriverConfigSchema", () => {
    it("accepts minimal valid OSS config", () => {
      const parsed = aliyunOssDriverConfigSchema.parse({
        region: "oss-cn-hangzhou",
        bucket: "my-bucket",
        accessKeyId: "id",
        accessKeySecret: "secret",
      });
      expect(parsed.region).toBe("oss-cn-hangzhou");
    });

    it("rejects missing required key", () => {
      expect(() =>
        aliyunOssDriverConfigSchema.parse({
          region: "oss-cn-hangzhou",
          bucket: "my-bucket",
          accessKeyId: "id",
        }),
      ).toThrow();
    });
  });

  describe("tencentCosDriverConfigSchema", () => {
    it("accepts minimal valid COS config", () => {
      expect(() =>
        tencentCosDriverConfigSchema.parse({
          region: "ap-guangzhou",
          bucket: "bucket-12345",
          secretId: "id",
          secretKey: "key",
        }),
      ).not.toThrow();
    });
  });

  describe("awsS3DriverConfigSchema", () => {
    it("accepts valid S3 config", () => {
      expect(() =>
        awsS3DriverConfigSchema.parse({
          region: "us-east-1",
          bucket: "my-bucket",
          accessKeyId: "id",
          secretAccessKey: "key",
        }),
      ).not.toThrow();
    });
  });

  describe("qiniuDriverConfigSchema", () => {
    it("accepts valid qiniu config", () => {
      expect(() =>
        qiniuDriverConfigSchema.parse({
          bucket: "my-bucket",
          accessKey: "ak",
          secretKey: "sk",
        }),
      ).not.toThrow();
    });
  });

  describe("minioDriverConfigSchema", () => {
    it("accepts valid minio config", () => {
      expect(() =>
        minioDriverConfigSchema.parse({
          bucket: "b",
          accessKey: "ak",
          secretAccessKey: "sk",
          endpoint: "https://minio.example.com",
        }),
      ).not.toThrow();
    });
  });

  describe("driverConfigSchemaMap", () => {
    it("exposes schemas for every driver", () => {
      const drivers = ["local", "aliyun-oss", "tencent-cos", "aws-s3", "qiniu", "minio"] as const;
      for (const d of drivers) {
        expect(driverConfigSchemaMap[d]).toBeDefined();
      }
    });
  });

  describe("createStorageSchema", () => {
    it("accepts a local storage payload", () => {
      const parsed = createStorageSchema.parse({
        name: "本地存储",
        driver: "local",
        config: { dir: "uploads" },
      });
      expect(parsed.name).toBe("本地存储");
      expect(parsed.status).toBe("enabled");
    });

    it("rejects empty name", () => {
      expect(() =>
        createStorageSchema.parse({
          name: "   ",
          driver: "local",
          config: {},
        }),
      ).toThrow();
    });

    it("rejects unknown driver", () => {
      expect(() =>
        createStorageSchema.parse({
          name: "x",
          driver: "azure",
          config: {},
        }),
      ).toThrow();
    });
  });

  describe("updateStorageSchema", () => {
    it("accepts partial patches", () => {
      const parsed = updateStorageSchema.parse({ name: "改名" });
      expect(parsed.name).toBe("改名");
    });

    it("all fields optional for update", () => {
      expect(() => updateStorageSchema.parse({})).not.toThrow();
    });
  });

  describe("storageListQuerySchema", () => {
    it("defaults pagination", () => {
      const parsed = storageListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("coerces isDefault from string", () => {
      const parsed = storageListQuerySchema.parse({ isDefault: "true" });
      expect(parsed.isDefault).toBe(true);
    });

    it("keeps boolean isDefault", () => {
      const parsed = storageListQuerySchema.parse({ isDefault: true });
      expect(parsed.isDefault).toBe(true);
    });

    it("rejects bad pageSize", () => {
      expect(() => storageListQuerySchema.parse({ pageSize: "999" })).toThrow();
    });
  });
});
