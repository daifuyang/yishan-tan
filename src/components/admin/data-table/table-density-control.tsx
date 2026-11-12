import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * 表格密度档位，对齐 antd Table 的 size 语义：
 * large / middle / small → default / middle / small。
 */
export type TableDensity = "default" | "middle" | "small";

/** 各档位的表头 / 数据行高度（与 ResourceTable 的视觉标准一致）。 */
export const DENSITY_CLASS: Record<TableDensity, string> = {
  default: "[&_thead_th]:h-12 [&_tbody_td]:h-[54px] [&_tbody_td]:py-2",
  middle: "[&_thead_th]:h-10 [&_tbody_td]:h-[46px] [&_tbody_td]:py-1.5",
  small: "[&_thead_th]:h-9 [&_tbody_td]:h-10 [&_tbody_td]:py-1",
};

const DENSITY_LABEL: Record<TableDensity, string> = {
  default: "宽松",
  middle: "中等",
  small: "紧凑",
};

const DENSITY_ORDER: TableDensity[] = ["default", "middle", "small"];

/**
 * columns-3-cog：三栏网格 + 右下角齿轮。
 *
 * 取自 lucide-static 的 `columns-3-cog` 图形（当前安装的 lucide-react 0.460 还没有该图标），
 * 描边风格与 lucide 一致：表达「列布局 / 尺寸可调」。
 */
function Columns3CogIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      role="img"
      aria-label="表格尺寸"
    >
      <path d="M10.6 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v5.6" />
      <path d="m14.305 19.53.923-.382" />
      <path d="M15 3v7.6" />
      <path d="m15.229 16.852-.924-.383" />
      <path d="m16.852 15.228-.383-.923" />
      <path d="m16.852 20.772-.383.924" />
      <path d="m19.148 15.228.383-.923" />
      <path d="m19.53 21.696-.382-.924" />
      <path d="m20.773 16.852.922-.383" />
      <path d="m20.773 19.148.922.383" />
      <path d="M9 3v18" />
      <circle cx="18" cy="18" r="3" />
    </svg>
  );
}

/**
 * 密度切换按钮（对应 antd ProTable 的 `options.density`）。
 *
 * antd 的密度是三档循环，这里做成弹出菜单直接选档，和列设置面板一致。
 */
export function TableDensityControl({
  value,
  onChange,
}: {
  value: TableDensity;
  onChange: (density: TableDensity) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={`表格尺寸：${DENSITY_LABEL[value]}`}
        >
          <Columns3CogIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-32 p-1.5">
        <div role="menu" aria-label="表格尺寸" className="flex flex-col">
          {DENSITY_ORDER.map((density) => (
            <button
              key={density}
              type="button"
              role="menuitemradio"
              aria-checked={density === value}
              className={cn(
                "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-line-soft",
                density === value ? "font-semibold text-text-strong" : "text-text-soft",
              )}
              onClick={() => {
                onChange(density);
                setOpen(false);
              }}
            >
              {DENSITY_LABEL[density]}
              {density === value ? <Check className="size-4" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
