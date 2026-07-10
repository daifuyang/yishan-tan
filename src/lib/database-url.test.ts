import { describe, expect, it } from "vitest";
import { getDatabaseUrl } from "./database-url";

describe("getDatabaseUrl", () => {
  it("uses DATABASE_URL when present", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgres://direct",
        DATABASE_USER: "user",
        DATABASE_PASSWORD: "password",
        DATABASE_HOST: "host",
        DATABASE_PORT: "5432",
        DATABASE_NAME: "name",
      }),
    ).toBe("postgres://direct");
  });

  it("builds a postgres URL from split database variables", () => {
    expect(
      getDatabaseUrl({
        DATABASE_USER: "yishan_tan_app",
        DATABASE_PASSWORD: "p@ss word",
        DATABASE_HOST: "172.23.212.135",
        DATABASE_NAME: "yishan_tan",
      }),
    ).toBe("postgres://yishan_tan_app:p%40ss%20word@172.23.212.135:5432/yishan_tan");
  });

  it("returns undefined when required split variables are missing", () => {
    expect(
      getDatabaseUrl({
        DATABASE_USER: "yishan_tan_app",
        DATABASE_PASSWORD: "password",
        DATABASE_HOST: "172.23.212.135",
      }),
    ).toBeUndefined();
  });
});
