import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIpFromHeaders, ipNetworkKey } from "~/lib/client-ip";

function headersOf(init: Record<string, string>): Headers {
  return new Headers(init);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clientIpFromHeaders", () => {
  it("没有任何 IP 头时返回 null（不伪造 127.0.0.1）", () => {
    expect(clientIpFromHeaders(headersOf({}))).toBeNull();
  });

  it("优先信任 x-real-ip", () => {
    const headers = headersOf({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("x-real-ip 存在但不可解析时不回退到 XFF", () => {
    const headers = headersOf({
      "x-real-ip": "not-an-ip",
      "x-forwarded-for": "2.2.2.2",
    });
    expect(clientIpFromHeaders(headers)).toBeNull();
  });

  it("XFF 多跳时取最后一跳（代理追加，客户端无法覆盖）", () => {
    expect(clientIpFromHeaders(headersOf({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" }))).toBe(
      "3.3.3.3",
    );
    expect(clientIpFromHeaders(headersOf({ "x-forwarded-for": " 2.2.2.2 " }))).toBe("2.2.2.2");
    expect(clientIpFromHeaders(headersOf({ "x-forwarded-for": "1.1.1.1,,2.2.2.2" }))).toBe(
      "2.2.2.2",
    );
  });

  it("剥离端口", () => {
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "203.0.113.7:8080" }))).toBe("203.0.113.7");
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "[2001:db8::1]:9000" }))).toBe(
      "2001:db8::1",
    );
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "[2001:db8::1]" }))).toBe("2001:db8::1");
  });

  it("接受 IPv6", () => {
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "::1" }))).toBe("::1");
  });

  it("拒绝非法 IP", () => {
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "999.1.1.1" }))).toBeNull();
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "1.2.3" }))).toBeNull();
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "1.2.3.4.5" }))).toBeNull();
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "example.com" }))).toBeNull();
    expect(clientIpFromHeaders(headersOf({ "x-real-ip": "" }))).toBeNull();
    expect(clientIpFromHeaders(headersOf({ "x-forwarded-for": "   " }))).toBeNull();
  });

  it("TRUSTED_CLIENT_IP_HEADER 指定的头存在但不可解析时返回 null", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "cf-connecting-ip");
    const headers = headersOf({ "cf-connecting-ip": "bogus", "x-real-ip": "203.0.113.7" });
    expect(clientIpFromHeaders(headers)).toBeNull();
  });

  it("TRUSTED_CLIENT_IP_HEADER 指定 x-forwarded-for 时取最后一跳", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "x-forwarded-for");
    const headers = headersOf({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("TRUSTED_CLIENT_IP_HEADER 未命中时不回退到其它头", () => {
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "cf-connecting-ip");
    const headers = headersOf({ "x-real-ip": "203.0.113.7" });
    expect(clientIpFromHeaders(headers)).toBeNull();
  });
});

describe("ipNetworkKey", () => {
  it("IPv4 收敛到 /24", () => {
    expect(ipNetworkKey("203.0.113.7")).toBe("203.0.113.0/24");
  });

  it("IPv6 收敛到前 3 段", () => {
    expect(ipNetworkKey("2001:db8::1")).toBe("2001:db8:::/48");
  });
});
