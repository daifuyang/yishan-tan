import { describe, expect, it } from "vitest";
import { REDACTED_PLACEHOLDER, redactConfig } from "~/features/storages/storages.service";

describe("storages.service.redactConfig", () => {
  it("redacts aliyun OSS accessKeySecret", () => {
    const redacted = redactConfig("aliyun-oss", {
      region: "oss-cn-hangzhou",
      accessKeySecret: "supersecret",
    });
    expect(redacted.region).toBe("oss-cn-hangzhou");
    expect(redacted.accessKeySecret).toBe(REDACTED_PLACEHOLDER);
  });

  it("redacts tencent COS secretKey", () => {
    const redacted = redactConfig("tencent-cos", {
      bucket: "b",
      secretKey: "topsecret",
    });
    expect(redacted.bucket).toBe("b");
    expect(redacted.secretKey).toBe(REDACTED_PLACEHOLDER);
  });

  it("redacts aws-s3 secretAccessKey", () => {
    const redacted = redactConfig("aws-s3", {
      bucket: "b",
      secretAccessKey: "topsecret",
    });
    expect(redacted.secretAccessKey).toBe(REDACTED_PLACEHOLDER);
  });

  it("redacts qiniu secretKey", () => {
    const redacted = redactConfig("qiniu", { bucket: "b", secretKey: "k" });
    expect(redacted.secretKey).toBe(REDACTED_PLACEHOLDER);
  });

  it("redacts minio secretAccessKey", () => {
    const redacted = redactConfig("minio", {
      bucket: "b",
      secretAccessKey: "k",
      endpoint: "https://minio.test",
    });
    expect(redacted.secretAccessKey).toBe(REDACTED_PLACEHOLDER);
    expect(redacted.endpoint).toBe("https://minio.test");
  });

  it("does not redact local config", () => {
    const redacted = redactConfig("local", { dir: "uploads" });
    expect(redacted).toEqual({ dir: "uploads" });
  });

  it("returns a new object (does not mutate input)", () => {
    const input = { accessKeySecret: "secret" };
    const redacted = redactConfig("aliyun-oss", input);
    expect(input.accessKeySecret).toBe("secret");
    expect(redacted).not.toBe(input);
  });
});
