import { describe, expect, it } from "vitest";
import {
  GENERIC_PHONE_MAX_LENGTH,
  GENERIC_PHONE_PATTERN,
  isValidPhone,
  parsePhoneIdentity,
  toE164,
} from "~/lib/phone";

describe("phone 通用校验", () => {
  it("接受 6~20 位数字（可带 + 前缀）", () => {
    expect(isValidPhone("13800138000")).toBe(true);
    expect(isValidPhone("+8613800138000")).toBe(true);
    expect(isValidPhone(" 13800138000 ")).toBe(true);
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("1380013800012345678901")).toBe(false);
    expect(isValidPhone("abc")).toBe(false);
    expect(isValidPhone("")).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });

  it("长度上限与正则常量一致", () => {
    expect(GENERIC_PHONE_MAX_LENGTH).toBe(20);
    expect(GENERIC_PHONE_PATTERN.test("13800138000")).toBe(true);
  });
});

describe("phone 国别解析", () => {
  it("解析中国大陆手机号", () => {
    const identity = parsePhoneIdentity({ phone: "13800138000" });
    expect(identity).toEqual({ countryCallingCode: "86", nationalNumber: "13800138000" });
    if (!identity) throw new Error("期望解析成功");
    expect(toE164(identity)).toBe("+8613800138000");
  });

  it("带 +86 前缀时也能解析", () => {
    const identity = parsePhoneIdentity({ phone: "+8613800138000" });
    expect(identity?.nationalNumber).toBe("13800138000");
  });

  it("非法号码返回 null", () => {
    expect(parsePhoneIdentity({ phone: "12345" })).toBeNull();
    expect(parsePhoneIdentity({ phone: "" })).toBeNull();
  });
});
