/** Mainland China calling code, stored without '+'. */
export const DEFAULT_COUNTRY_CALLING_CODE = "86";

/**
 * 通用手机号格式：可选 `+` 前缀 + 6~20 位数字。
 *
 * 这是本仓库用户资料（创建 / 编辑用户）的既有口径，与国别无关；
 * `parsePhoneIdentity` / `toE164` 那套「国别码 + 国内号」是面向只做中国大陆的
 * 产品形态，本仓库的用户表没有 countryCallingCode 字段，因此不启用——
 * 换用 CN 专用规则会拒掉现有资料里的国际号码，属于行为变更。
 */
export const GENERIC_PHONE_PATTERN = /^\+?\d{6,20}$/;
export const GENERIC_PHONE_MESSAGE = "手机号格式不正确";
export const GENERIC_PHONE_MAX_LENGTH = 20;

/** 通用手机号是否合法（不含长度上限判断）。 */
export function isValidPhone(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > GENERIC_PHONE_MAX_LENGTH) return false;
  return GENERIC_PHONE_PATTERN.test(trimmed);
}

export const COUNTRY_CALLING_CODE_PATTERN = /^\d{1,4}$/;
export const CN_NATIONAL_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

/** Input may still include an optional +86 prefix from older clients. */
export const CHINA_MOBILE_PATTERN = /^(?:\+86)?1[3-9]\d{9}$/;
export const CHINA_MOBILE_MESSAGE = "请输入正确的11位中国大陆手机号";
export const UNSUPPORTED_COUNTRY_MESSAGE = "暂仅支持中国大陆手机号";

export type PhoneIdentity = {
  countryCallingCode: string;
  nationalNumber: string;
};

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeCallingCode(value: string | null | undefined): string {
  const digits = digitsOnly((value ?? DEFAULT_COUNTRY_CALLING_CODE).trim());
  return digits || DEFAULT_COUNTRY_CALLING_CODE;
}

/**
 * Split a form/API phone into country calling code + national number.
 * Accepts national digits, `86…`, or `+86…` when the country is China.
 */
export function parsePhoneIdentity(input: {
  countryCallingCode?: string | null;
  phone: string;
}): PhoneIdentity | null {
  const countryCallingCode = normalizeCallingCode(input.countryCallingCode);
  if (!COUNTRY_CALLING_CODE_PATTERN.test(countryCallingCode)) return null;

  const trimmed = input.phone.trim();
  if (!trimmed) return null;
  let national = digitsOnly(trimmed);
  if (!national) return null;

  if (national.startsWith(countryCallingCode)) {
    const stripped = national.slice(countryCallingCode.length);
    const looksInternational =
      trimmed.startsWith("+") ||
      (countryCallingCode === DEFAULT_COUNTRY_CALLING_CODE && national.length === 13);
    if (looksInternational && stripped.length >= 6) national = stripped;
  }

  if (countryCallingCode === DEFAULT_COUNTRY_CALLING_CODE) {
    if (!CN_NATIONAL_MOBILE_PATTERN.test(national)) return null;
  } else if (!/^\d{6,15}$/.test(national)) {
    return null;
  }

  return { countryCallingCode, nationalNumber: national };
}

export function toE164(identity: PhoneIdentity): string {
  return `+${identity.countryCallingCode}${identity.nationalNumber}`;
}
