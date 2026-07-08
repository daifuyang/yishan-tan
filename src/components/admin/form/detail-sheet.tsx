import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type DetailSheetSize = "sm" | "md" | "lg" | "xl" | "full";

type DetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: DetailSheetSize;
  side?: "right" | "left";
  dismissible?: boolean;
  contentClassName?: string;
  children?: React.ReactNode;
};

const SIZE_WIDTH: Record<DetailSheetSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-2xl",
};

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  side = "right",
  dismissible = true,
  contentClassName,
  children,
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={dismissible ? onOpenChange : undefined}>
      <SheetContent side={side} className={cn("w-full", SIZE_WIDTH[size], contentClassName)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="mt-6 space-y-4 text-[13px]">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

type DetailSheetRowProps = {
  label: React.ReactNode;
  value?: React.ReactNode;
  children?: React.ReactNode;
  mono?: boolean;
  break?: boolean;
  fullWidth?: boolean;
};

export function DetailSheetRow({
  label,
  value,
  children,
  mono,
  break: shouldBreak,
  fullWidth,
}: DetailSheetRowProps) {
  const colClass = fullWidth
    ? "grid grid-cols-1 gap-1"
    : "grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3";
  return (
    <div className={colClass}>
      <span className="text-text-mute">{label}</span>
      <div className="min-w-0 text-text-strong">
        {children ?? (
          <span
            className={cn(
              mono && "font-mono text-[12px]",
              shouldBreak && "break-all whitespace-pre-wrap",
            )}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

DetailSheet.displayName = "DetailSheet";
DetailSheetRow.displayName = "DetailSheetRow";

// 重新导出 Button 方便 DetailSheet 使用者快速放底部操作区
export { Button as DetailSheetButton };
