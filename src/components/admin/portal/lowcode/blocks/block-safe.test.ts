import { describe, expect, it } from "vitest";

import { safeColor, safeImageSrc } from "./block-safe";

describe("safeColor", () => {
  it("放行 hex / rgb / hsl / 命名色", () => {
    for (const ok of [
      "#fff",
      "#2463EB",
      "#2463ebcc",
      "rgb(1, 2, 3)",
      "rgba(0,0,0,.5)",
      "hsl(210 50% 40%)",
      "navy",
    ]) {
      expect(safeColor(ok), ok).toBe(ok);
    }
  });

  it("挡掉能夹带其它 CSS 的值", () => {
    for (const bad of [
      "red; background:url(x)",
      "url(javascript:1)",
      "#fff}",
      "expression(1)",
      "var(--x)",
      "1 2",
      "",
      "  ",
      null,
      undefined,
      12,
    ]) {
      expect(safeColor(bad), String(bad)).toBeUndefined();
    }
  });

  it("两端空白会被去掉", () => {
    expect(safeColor("  #fff  ")).toBe("#fff");
  });
});

describe("safeImageSrc", () => {
  it("放行 http(s) 地址、站内路径、内联位图", () => {
    for (const ok of [
      "https://cdn.example.com/a/b.png",
      "http://example.com/x.jpg?w=100&h=50",
      "/uploads/2026/11/a.webp",
      "./img/a.png",
      "../img/a.png",
      "data:image/png;base64,iVBORw0KGgo=",
      "data:image/jpeg;base64,/9j/4AAQ",
    ]) {
      expect(safeImageSrc(ok), ok).toBe(ok);
    }
  });

  it("拒绝脚本协议、非位图的 data、file:、协议相对地址", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/png,notbase64",
      "file:///etc/passwd",
      "//evil.com/a.png",
      "ftp://x/a.png",
      "vbscript:x",
    ]) {
      expect(safeImageSrc(bad), bad).toBe("");
    }
  });

  it('拒绝能逃出 url("…") 或属性的字符：引号、括号、尖括号、空白、反斜杠', () => {
    for (const bad of [
      'https://x.com/a.png"); background:red; (',
      "https://x.com/a b.png",
      "https://x.com/a.png'onerror=x",
      "https://x.com/<script>.png",
      "https://x.com/a(1).png",
      "/a\\b.png",
      "https://x.com/a\n.png",
    ]) {
      expect(safeImageSrc(bad), JSON.stringify(bad)).toBe("");
    }
  });

  it("空值 / 非字符串返回空串；两端空白会被去掉", () => {
    for (const empty of ["", "   ", null, undefined, 5, {}]) expect(safeImageSrc(empty)).toBe("");
    expect(safeImageSrc("  /a.png  ")).toBe("/a.png");
  });

  it("内联位图有体积上限，防止把整张大图塞进 schema", () => {
    const big = `data:image/png;base64,${"A".repeat(700_000)}`;
    expect(safeImageSrc(big)).toBe("");
  });
});
