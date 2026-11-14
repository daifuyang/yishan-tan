/**
 * 区块缩略图：每个模板一张 16:9 的示意图，是**图片文件**，放在 `blocks/thumbnails/`。
 *
 * 模板的 `thumbnail` 字段有两种写法：
 * - 文件名（不含扩展名），如 `hero-split` → 取 `blocks/thumbnails/hero-split.svg`（打包时由 Vite 处理）；
 * - 图片地址（`https://…` 或站内 `/…`），直接用，方便以后改成素材库 / 配置里的图。
 *
 * 换图只需替换文件（svg / png / webp 都行，保持 16:9），不用改代码；新增模板就放一张同名图片。
 */
import type { ReactNode } from "react";

import { safeImageSrc } from "./blocks/block-safe";

const FILES = import.meta.glob("./blocks/thumbnails/*.{svg,png,webp,jpg}", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** 文件名（不含扩展名）→ 打包后的图片地址。 */
export const BLOCK_THUMBNAIL_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [
    (path.split("/").pop() ?? path).replace(/\.[a-z]+$/i, ""),
    url,
  ]),
);

/** `thumbnail` 字段 → 图片地址；找不到（没放图 / 地址不安全）返回 undefined，面板退回占位图。 */
export function resolveThumbnailSrc(thumbnail: string): string | undefined {
  if (/^(https?:\/\/|\/)/i.test(thumbnail)) return safeImageSrc(thumbnail) || undefined;
  return BLOCK_THUMBNAIL_URLS[thumbnail];
}

const BG = "#f5f6f8";
const MUTED = "#c4ccd8";
const SOFT = "#e9ebef";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 90"
      className="h-full w-full"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="160" height="90" fill={BG} />
      {children}
    </svg>
  );
}

/** 没有对应图片的模板用它：虚线框加方块。 */
export function GenericBlockThumb() {
  return (
    <Frame>
      <rect
        x="30"
        y="14"
        width="100"
        height="62"
        rx="4"
        fill="#fff"
        stroke={MUTED}
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <rect x="71" y="37" width="18" height="16" rx="3" fill={SOFT} />
    </Frame>
  );
}
