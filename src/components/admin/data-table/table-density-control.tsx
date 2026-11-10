import { Check, Rows3 } from "lucide-react";
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
          aria-label="表格密度"
          title={`表格密度：${DENSITY_LABEL[value]}`}
        >
          <Rows3 className="size-3.5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-32 p-1.5">
        <div role="menu" aria-label="表格密度" className="flex flex-col">
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
              {density === value ? <Check className="size-3.5" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
