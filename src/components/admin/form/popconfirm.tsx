"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PopconfirmSide = "top" | "right" | "bottom" | "left";
type PopconfirmAlign = "start" | "center" | "end";
type PopconfirmTone = "default" | "danger";

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
  side?: PopconfirmSide;
  align?: PopconfirmAlign;
  sideOffset?: number;
  alignOffset?: number;
  className?: string;
};

const PopconfirmRoot = PopoverPrimitive.Root;
const PopconfirmTrigger = PopoverPrimitive.Trigger;
const PopconfirmPortal = PopoverPrimitive.Portal;
const PopconfirmAnchor = PopoverPrimitive.Anchor;

function PopconfirmContent({
  className,
  sideOffset = 6,
  side = "top",
  align = "end",
  alignOffset,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popconfirm-content"
        sideOffset={sideOffset}
        side={side}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          "z-50 w-[260px] rounded-[6px] border border-line bg-white p-3 text-text-strong shadow-card-hover",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[closed]:fade-out-0 data-[open]:fade-in-0",
          "data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function Popconfirm({
  open,
  defaultOpen,
  onOpenChange,
  children,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "default",
  loading = false,
  onConfirm,
  side = "top",
  align = "end",
  sideOffset = 6,
  alignOffset,
  className,
}: PopconfirmProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = React.useState(false);
  const isBusy = loading || confirming;

  React.useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const handleConfirm = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBusy) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBusy) return;
    onOpenChange?.(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirming(false);
    onOpenChange?.(next);
  };

  return (
    <PopconfirmRoot open={open} defaultOpen={defaultOpen} onOpenChange={handleOpenChange}>
      <PopconfirmTrigger asChild>{children}</PopconfirmTrigger>
      <PopconfirmPortal>
        <PopconfirmContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          className={className}
          onOpenAutoFocus={(e) => {
            // 默认焦点落在「取消」按钮，防止误触危险操作
            e.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <div className="space-y-2">
            <p className="text-[13px] font-medium leading-[1.5] text-text-strong">{title}</p>
            {description ? (
              <p className="text-[12px] leading-[1.5] text-text-soft">{description}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-end gap-2">
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

export type { PopconfirmProps, PopconfirmSide, PopconfirmAlign, PopconfirmTone };
