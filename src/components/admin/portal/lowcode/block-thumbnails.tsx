/**
 * 区块缩略图：每个区块一张 132×100 的线框示意（SVG，无外部图片、无请求）。
 *
 * 只画「这是个什么结构」，不追求像素还原：浅灰页面底 + 白色区块 + 蓝色强调，
 * 与面板的 12px 极简风格一致。新增区块时在 `block-panel.tsx` 的目录里登记并补一张。
 */
import type { ReactNode } from "react";

const BG = "#f5f6f8";
const LINE = "#e2e5ea";
const SOFT = "#e9ebef";
const MUTED = "#cbd2dc";
const ACCENT = "#2f7cf6";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 132 100"
      className="h-full w-full"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="132" height="100" fill={BG} />
      {children}
    </svg>
  );
}

/** 灰色占位文字行。 */
function Lines({ x, y, widths }: { x: number; y: number; widths: number[] }) {
  return (
    <>
      {widths.map((w, i) => (
        <rect
          key={`${y}-${w}-${x}-${i * 7}`}
          x={x}
          y={y + i * 8}
          width={w}
          height="4"
          rx="2"
          fill={SOFT}
        />
      ))}
    </>
  );
}

export function SiteHeaderThumb() {
  return (
    <Frame>
      <rect
        x="6"
        y="10"
        width="120"
        height="24"
        rx="3"
        fill="#fff"
        stroke={LINE}
        strokeWidth="0.8"
      />
      <rect x="12" y="17" width="13" height="10" rx="2.5" fill={ACCENT} />
      <rect x="31" y="20" width="15" height="4" rx="2" fill={MUTED} />
      <rect x="51" y="20" width="15" height="4" rx="2" fill={MUTED} />
      <rect x="71" y="20" width="15" height="4" rx="2" fill={MUTED} />
      <rect x="98" y="16.5" width="22" height="11" rx="5.5" fill={ACCENT} />
      <Lines x={6} y={46} widths={[88, 104, 72]} />
      <rect x="6" y="74" width="56" height="18" rx="3" fill={SOFT} />
      <rect x="70" y="74" width="56" height="18" rx="3" fill={SOFT} />
    </Frame>
  );
}

export function AnnouncementThumb() {
  return (
    <Frame>
      <rect x="0" y="12" width="132" height="14" fill={ACCENT} />
      <rect x="30" y="17.5" width="46" height="3.5" rx="1.75" fill="#fff" opacity="0.92" />
      <rect x="82" y="17.5" width="18" height="3.5" rx="1.75" fill="#fff" opacity="0.6" />
      <path
        d="M118 16.5 l5 5 m0 -5 l-5 5"
        stroke="#fff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.8"
      />
      <rect
        x="6"
        y="36"
        width="120"
        height="22"
        rx="3"
        fill="#fff"
        stroke={LINE}
        strokeWidth="0.8"
      />
      <Lines x={6} y={68} widths={[96, 70]} />
    </Frame>
  );
}

export function PageLayoutThumb() {
  return (
    <Frame>
      <rect
        x="6"
        y="8"
        width="120"
        height="16"
        rx="3"
        fill="#fff"
        stroke={ACCENT}
        strokeWidth="0.9"
      />
      <rect x="12" y="14" width="12" height="4" rx="2" fill={ACCENT} />
      <rect
        x="6"
        y="30"
        width="120"
        height="44"
        rx="3"
        fill="#fff"
        stroke={LINE}
        strokeWidth="0.8"
        strokeDasharray="3 2"
      />
      <rect x="14" y="38" width="48" height="6" rx="3" fill={SOFT} />
      <rect x="14" y="50" width="96" height="4" rx="2" fill={SOFT} />
      <rect x="14" y="58" width="76" height="4" rx="2" fill={SOFT} />
      <rect
        x="6"
        y="80"
        width="120"
        height="12"
        rx="3"
        fill="#fff"
        stroke={LINE}
        strokeWidth="0.8"
      />
      <rect x="12" y="84.5" width="30" height="3" rx="1.5" fill={MUTED} />
    </Frame>
  );
}

/** 目录里没登记的区块用它：虚线框加方块。 */
export function GenericBlockThumb() {
  return (
    <Frame>
      <rect
        x="22"
        y="20"
        width="88"
        height="60"
        rx="4"
        fill="#fff"
        stroke={MUTED}
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <rect x="58" y="42" width="16" height="16" rx="3" fill={SOFT} />
    </Frame>
  );
}
