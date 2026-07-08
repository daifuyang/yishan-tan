import { Loader2 } from "lucide-react";
import type * as React from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FormSheetSize = "sm" | "md" | "lg" | "xl" | "full";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: FormSheetSize;
  side?: "right" | "left";
  form?: UseFormReturn<Record<string, unknown>>;
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  contentClassName?: string;
  errorMessage?: React.ReactNode;
  collectMode?: "formdata";
};

const SIZE_WIDTH: Record<FormSheetSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-2xl",
};

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "保存",
  cancelLabel = "取消",
  loading,
  size = "md",
  side = "right",
  form,
  onSubmit,
  children,
  footer,
  dismissible = true,
  contentClassName,
  errorMessage,
  collectMode = "formdata",
}: FormSheetProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!onSubmit) return;
    if (form) {
      void form.handleSubmit(onSubmit)();
      return;
    }
    if (collectMode === "formdata") {
      const data = new FormData(e.currentTarget);
      const values: Record<string, unknown> = {};
      for (const [key, value] of data.entries()) values[key] = value;
      void onSubmit(values);
    }
  };

  const handleInteractOutside = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  const handleEscapeKeyDown = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          SIZE_WIDTH[size],
          "flex flex-col gap-0 overflow-hidden p-0",
          contentClassName,
        )}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <SheetHeader className="shrink-0 border-b border-line px-6 py-4">
          <SheetTitle className="text-[15px] font-semibold">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="mt-1 text-[12.5px] text-text-soft">
              {description}
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden [&_label[data-slot=label]]:mb-2 [&_label[data-slot=label]]:block [&_label[data-slot=label]]:text-ex-14 [&_label[data-slot=label]]:font-medium [&_label[data-slot=label]]:leading-5 [&_label[data-slot=label]]:text-text-strong [&_label[data-slot=label]+*]:!mt-0"
        >
          {errorMessage ? (
            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            {children}
          </div>
          {footer !== undefined ? (
            footer
          ) : (
            <SheetFooter className="mt-auto shrink-0 flex-row justify-end gap-2 border-t border-line bg-line-soft/40 px-6 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {submitLabel}
              </Button>
            </SheetFooter>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
