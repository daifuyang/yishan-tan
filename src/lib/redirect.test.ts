import { describe, expect, it } from "vitest";
import { SAFE_NEXT_PREFIXES, sanitizeAdminNext, sanitizeNext } from "~/lib/redirect";

describe("redirect 白名单", () => {
  it("只放行真实存在的顶层路由前缀", () => {
    expect(SAFE_NEXT_PREFIXES).toEqual(["/admin"]);
  });

  it("放行 /admin 下的站内相对路径", () => {
    expect(sanitizeNext("/admin")).toBe("/admin");
    expect(sanitizeNext("/admin/users")).toBe("/admin/users");
    expect(sanitizeNext("/admin/users?tab=roles")).toBe("/admin/users?tab=roles");
    expect(sanitizeNext("/admin/users#top")).toBe("/admin/users#top");
  });

  it("放行白名单之外的路径时落到 fallback", () => {
    expect(sanitizeNext("/")).toBe("/");
    expect(sanitizeNext("/", "/admin")).toBe("/admin");
    expect(sanitizeNext("/login", "/admin")).toBe("/admin");
    expect(sanitizeNext("/settings", "/admin")).toBe("/admin");
    // /adminx 不是 /admin 的子路径
    expect(sanitizeNext("/adminx", "/admin")).toBe("/admin");
    expect(sanitizeNext("/administrator", "/admin")).toBe("/admin");
  });

  it("拒绝空值", () => {
    expect(sanitizeNext(undefined, "/admin")).toBe("/admin");
    expect(sanitizeNext(null, "/admin")).toBe("/admin");
    expect(sanitizeNext("", "/admin")).toBe("/admin");
    expect(sanitizeNext("   ", "/admin")).toBe("/admin");
  });

  it("拒绝协议相对地址与外站地址", () => {
    expect(sanitizeNext("//evil.com", "/admin")).toBe("/admin");
    expect(sanitizeNext("///evil.com", "/admin")).toBe("/admin");
    expect(sanitizeNext("https://evil.com/admin", "/admin")).toBe("/admin");
    expect(sanitizeNext("http://evil.com/admin/users", "/admin")).toBe("/admin");
    expect(sanitizeNext("javascript:alert(1)", "/admin")).toBe("/admin");
    expect(sanitizeNext("JavaScript:alert(1)", "/admin")).toBe("/admin");
    expect(sanitizeNext("data:text/html,<script>", "/admin")).toBe("/admin");
    expect(sanitizeNext("/javascript:alert(1)", "/admin")).toBe("/admin");
  });

  it("拒绝路径穿越", () => {
    expect(sanitizeNext("/admin/../x", "/admin")).toBe("/admin");
    expect(sanitizeNext("/admin/../../etc/passwd", "/admin")).toBe("/admin");
    expect(sanitizeNext("/admin/..%2f..%2fx", "/admin")).toBe("/admin");
    expect(sanitizeNext("/admin/%2e%2e/x", "/admin")).toBe("/admin");
    expect(sanitizeNext("/admin\\..\\x", "/admin")).toBe("/admin");
  });

  it("拒绝大小写与编码变体绕过", () => {
    // 白名单前缀大小写敏感：/ADMIN 不是 /admin
    expect(sanitizeNext("/ADMIN/users", "/admin")).toBe("/admin");
    expect(sanitizeNext("/Admin", "/admin")).toBe("/admin");
    // 编码后的双斜杠
    expect(sanitizeNext("/admin%2f%2fevil.com", "/admin")).toBe("/admin");
    expect(sanitizeNext("/%2f%2fevil.com", "/admin")).toBe("/admin");
    // 带空格的 scheme
    expect(sanitizeNext(" java script:alert(1)", "/admin")).toBe("/admin");
  });

  it("拒绝跳回登录页造成的循环", () => {
    expect(sanitizeNext("/login", "/admin")).toBe("/admin");
    expect(sanitizeNext("/login/extra", "/admin")).toBe("/admin");
    expect(sanitizeNext("/admin/login", "/admin")).toBe("/admin");
  });

  it("同源绝对 URL 归一为站内相对路径", () => {
    const origin = "https://tan.example.com";
    expect(sanitizeNext("https://tan.example.com/admin/users", "/admin", origin)).toBe(
      "/admin/users",
    );
    expect(sanitizeNext("https://tan.example.com/admin/users?a=1", "/admin", origin)).toBe(
      "/admin/users?a=1",
    );
    // 非同源一律拒绝
    expect(sanitizeNext("https://evil.com/admin/users", "/admin", origin)).toBe("/admin");
    // 未给出 origin 时不信任绝对 URL
    expect(sanitizeNext("https://tan.example.com/admin/users", "/admin")).toBe("/admin");
  });

  it("sanitizeAdminNext 保证落点在 /admin 下", () => {
    expect(sanitizeAdminNext("/admin/users")).toBe("/admin/users");
    expect(sanitizeAdminNext("/admin")).toBe("/admin");
    expect(sanitizeAdminNext("/admin?tab=1")).toBe("/admin?tab=1");
    expect(sanitizeAdminNext("/")).toBe("/admin");
    expect(sanitizeAdminNext("/login")).toBe("/admin");
    expect(sanitizeAdminNext("//evil.com")).toBe("/admin");
    expect(sanitizeAdminNext(undefined)).toBe("/admin");
  });
});
