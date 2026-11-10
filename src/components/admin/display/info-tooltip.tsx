import { Info } from "lucide-react";
import type * as React from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "~/lib/utils";

type InfoTooltipProps = {
  /** 提示内容；保持一到两行的简短说明。 */
  content: React.ReactNode;
  /** 提示显示方向，默认向上。 */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
};

/**
 * 统一的 Tips 图标提示：中性灰 Info 图标，悬停 / 聚焦时显示系统 Tooltip。
 * 仅用于模块标题 / 表头等处的解释性文案，不承载业务数据。
 */
export function InfoTooltip({
  content,
  side = "top",
  align = "center",
  className,
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="查看说明"
            className={cn(
              "inline-flex size-3.5 shrink-0 cursor-help items-center justify-center text-text-mute transition-colors hover:text-brand-600 focus-visible:text-brand-600 focus-visible:outline-none",
              className,
            )}
          >
            <Info className="size-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-[240px] text-xs leading-relaxed">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
