"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PopconfirmSide = "top" | "right" | "bottom" | "left";
type PopconfirmAlign = "start" | "center" | "end";
type PopconfirmTone = "default" | "danger";
type PopconfirmPlacement =
  | "top"
  | "topLeft"
  | "topRight"
  | "bottom"
  | "bottomLeft"
  | "bottomRight"
  | "left"
  | "leftTop"
  | "leftBottom"
  | "right"
  | "rightTop"
  | "rightBottom";

type PopconfirmProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 触发器（通常是不可见的 span 作为定位锚点） */
  children: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: PopconfirmTone;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  placement?: PopconfirmPlacement;
  side?: PopconfirmSide;
  align?: PopconfirmAlign;
  sideOffset?: number;
  alignOffset?: number;
  arrow?: boolean;
  className?: string;
};

const PopconfirmRoot = PopoverPrimitive.Root;
const PopconfirmTrigger = PopoverPrimitive.Trigger;
const PopconfirmPortal = PopoverPrimitive.Portal;
const PopconfirmAnchor = PopoverPrimitive.Anchor;

const PLACEMENT_MAP: Record<PopconfirmPlacement, { side: PopconfirmSide; align: PopconfirmAlign }> =
  {
    top: { side: "top", align: "center" },
    topLeft: { side: "top", align: "start" },
    topRight: { side: "top", align: "end" },
    bottom: { side: "bottom", align: "center" },
    bottomLeft: { side: "bottom", align: "start" },
    bottomRight: { side: "bottom", align: "end" },
    left: { side: "left", align: "center" },
    leftTop: { side: "left", align: "start" },
    leftBottom: { side: "left", align: "end" },
    right: { side: "right", align: "center" },
    rightTop: { side: "right", align: "start" },
    rightBottom: { side: "right", align: "end" },
  };

function PopconfirmContent({
  className,
  sideOffset = 6,
  side = "top",
  align = "end",
  alignOffset,
  arrow = false,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & { arrow?: boolean }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popconfirm-content"
        sideOffset={sideOffset}
        side={side}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "z-50 w-[232px] overflow-visible rounded-[6px] border border-line bg-white p-2.5 text-text-strong shadow-card-hover",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[closed]:fade-out-0 data-[open]:fade-in-0",
          "data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {arrow ? (
          <PopoverPrimitive.Arrow asChild width={14} height={7}>
            <span
              aria-hidden
              className={cn(
                "relative block h-[7px] w-[14px] overflow-visible",
                side === "right" && "h-[14px] w-[7px]",
                side === "left" && "h-[14px] w-[7px]",
              )}
            >
              <span
                className={cn(
                  "absolute z-10 bg-white",
                  side === "top" && "top-[-1px] left-1/2 h-0.5 w-3 -translate-x-1/2",
                  side === "bottom" && "bottom-[-1px] left-1/2 h-0.5 w-3 -translate-x-1/2",
                  side === "left" && "right-[-1px] top-1/2 h-3 w-0.5 -translate-y-1/2",
                  side === "right" && "left-[-1px] top-1/2 h-3 w-0.5 -translate-y-1/2",
                )}
              />
              <span
                className={cn(
                  "absolute z-20 size-2.5 rotate-45 bg-white",
                  side === "top" &&
                    "left-1/2 top-[-5px] -translate-x-1/2 border-r border-b border-line",
                  side === "bottom" &&
                    "bottom-[-5px] left-1/2 -translate-x-1/2 border-l border-t border-line",
                  side === "left" &&
                    "right-[-5px] top-1/2 -translate-y-1/2 border-t border-r border-line",
                  side === "right" &&
                    "left-[-5px] top-1/2 -translate-y-1/2 border-b border-l border-line",
                )}
              />
            </span>
          </PopoverPrimitive.Arrow>
        ) : null}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function Popconfirm({
  open,
  onOpenChange,
  children,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "default",
  loading = false,
  onConfirm,
  placement,
  side = "top",
  align = "end",
  sideOffset = 6,
  alignOffset,
  arrow = false,
  className,
}: PopconfirmProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = React.useState(false);
  const isBusy = loading || confirming;
  const resolvedPlacement = placement ? PLACEMENT_MAP[placement] : { side, align };

  React.useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const handleConfirm = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    // 不 stopPropagation：Radix Popover 监听 pointerdown，不是 click，不会因为
    // click 冒泡而误关 popover。允许冒泡让父级 onClick 正常响应。
    if (isBusy) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      // 保留最后一次 confirming 状态给 onOpenChange(false) 流程：
      // 父级常常在 onConfirm 成功后立即 setOpen(false)，这时 React 还没 re-render，
      // 直接 setConfirming(false) 会丢一次 render。延后到下一 microtask。
      setTimeout(() => setConfirming(false), 0);
    }
  };

  const handleCancel = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (isBusy) return;
    onOpenChange?.(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirming(false);
    onOpenChange?.(next);
  };

  return (
    <PopconfirmRoot open={open} onOpenChange={handleOpenChange}>
      <PopconfirmTrigger asChild>{children}</PopconfirmTrigger>
      <PopconfirmPortal>
        <PopconfirmContent
          side={resolvedPlacement.side}
          align={resolvedPlacement.align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          arrow={arrow}
          className={className}
          onOpenAutoFocus={(e) => {
            // 默认焦点落在「取消」按钮，防止误触危险操作
            e.preventDefault();
            cancelRef.current?.focus();
          }}
          onFocusOutside={(e) => {
            // Popconfirm 只在点击外部时关闭；焦点抖动（例如 DropdownMenu 关闭回焦）
            // 不应直接把确认框收掉。
            e.preventDefault();
          }}
        >
          <div className="space-y-1.5">
            <p className="text-[13px] font-medium leading-[1.5] text-text-strong">{title}</p>
            {description ? (
              <p className="text-[12px] leading-[1.5] text-text-soft">{description}</p>
            ) : null}
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isBusy}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tone === "danger" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isBusy}
              >
                {confirming ? "处理中…" : confirmLabel}
              </Button>
            </div>
          </div>
        </PopconfirmContent>
      </PopconfirmPortal>
    </PopconfirmRoot>
  );
}

export {
  Popconfirm,
  PopconfirmRoot,
  PopconfirmTrigger,
  PopconfirmPortal,
  PopconfirmAnchor,
  PopconfirmContent,
};

export type {
  PopconfirmProps,
  PopconfirmSide,
  PopconfirmAlign,
  PopconfirmPlacement,
  PopconfirmTone,
};
