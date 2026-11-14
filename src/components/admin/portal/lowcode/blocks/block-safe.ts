/**
 * 业务区块写进样式 / 属性前的白名单校验。
 *
 * schema 里的值不可信（手写 JSON、旧数据、粘贴来的内容）：颜色、图片地址最终会进 `style`
 * 或 `<img src>`，不校验就能夹带 `;`、`}`、`javascript:` 之类的东西。这里统一收口，
 * 不合法一律返回空串 / undefined，由调用方退回默认值，而不是抛错或把脏值写出去。
 */
import { str } from "./block-kit";

/** 只放行 `#rgb` / `#rrggbb` / `rgb()` / `hsl()` / 命名色，挡掉能夹带其它 CSS 的值。 */
const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/-]+\)|[a-z]{3,20})$/i;

export function safeColor(value: unknown): string | undefined {
  const color = str(value).trim();
  return color && COLOR.test(color) ? color : undefined;
}

const HTTP_URL = /^https?:\/\/[^\s"'<>()\\]+$/i;
/** 站内路径：`/a/b.png`（不能是 `//host` 这种协议相对地址）、`./x`、`../x`。 */
const SITE_PATH = /^(\/(?!\/)|\.{1,2}\/)[^\s"'<>()\\]*$/;
/** 内联位图：只认 base64 的常见位图格式；`image/svg+xml` 不放行（能内嵌脚本），也不认 `data:text/*`。 */
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i;
const MAX_DATA_URL = 600_000;

/**
 * 图片地址：http(s)、站内路径、内联位图。其它（`javascript:`、`file:`、`data:text/html`、
 * 含引号 / 括号 / 空白的值）都返回空串。结果可以安全放进 `<img src>`。
 */
export function safeImageSrc(value: unknown): string {
  const src = str(value).trim();
  if (!src) return "";
  if (src.startsWith("data:")) {
    return src.length <= MAX_DATA_URL && DATA_IMAGE.test(src) ? src : "";
  }
  return HTTP_URL.test(src) || SITE_PATH.test(src) ? src : "";
}
