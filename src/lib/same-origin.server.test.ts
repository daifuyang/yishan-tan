import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOriginRequest } from "~/lib/same-origin.server";

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertSameOriginRequest", () => {
  it("没有 Origin 头时放行（服务端 agent / curl）", () => {
    expect(() =>
      assertSameOriginRequest(makeRequest("https://tan.example.com/api/v1/users")),
    ).not.toThrow();
  });

  it("Origin 等于请求自身 origin 时放行", () => {
    expect(() =>
      assertSameOriginRequest(
        makeRequest("https://tan.example.com/api/v1/users", {
          origin: "https://tan.example.com",
        }),
      ),
    ).not.toThrow();
  });

  it("配置 APP_BASE_URL 时，反向代理改写 Host 也不误判", () => {
    vi.stubEnv("APP_BASE_URL", "https://tan.example.com");
    expect(() =>
      assertSameOriginRequest(
        makeRequest("http://127.0.0.1:3000/api/v1/users", {
          origin: "https://tan.example.com",
        }),
      ),
    ).not.toThrow();
  });

  it("跨站来源被拒绝", () => {
    vi.stubEnv("APP_BASE_URL", "https://tan.example.com");
    let caught: unknown;
    try {
      assertSameOriginRequest(
        makeRequest("https://tan.example.com/api/v1/users", { origin: "https://evil.com" }),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe("FORBIDDEN");
  });

  it("sec-fetch-site: cross-site 直接拒绝", () => {
    expect(() =>
      assertSameOriginRequest(
        makeRequest("https://tan.example.com/api/v1/users", {
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toThrow();
  });

  it("opaque origin（null）被拒绝", () => {
    let caught: unknown;
    try {
      assertSameOriginRequest(
        makeRequest("https://tan.example.com/api/v1/users", { origin: "null" }),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();
  });
});
