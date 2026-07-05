import { Loader2 } from "lucide-react";
import type * as React from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormDialogSize = "sm" | "md" | "lg" | "xl" | "full";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: FormDialogSize;
  form?: UseFormReturn<Record<string, unknown>>;
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  contentClassName?: string;
  errorMessage?: React.ReactNode;
  /** 仅当未传 form 时生效：从原生表单收集值的方式。"formdata" 走 FormData(form) 转对象；"current" 走当前受控 children 状态由调用方手动处理。 */
  collectMode?: "formdata";
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "保存",
  cancelLabel = "取消",
  loading,
  size = "md",
  form,
  onSubmit,
  children,
  footer,
  dismissible = true,
  contentClassName,
  errorMessage,
  collectMode = "formdata",
}: FormDialogProps) {
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
    if (!dismissible) {
      e.preventDefault();
    }
  };

  const handleEscapeKeyDown = (e: Event) => {
    if (!dismissible) {
      e.preventDefault();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        showClose={dismissible}
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
        className={cn("gap-0 p-0 sm:max-w-lg", contentClassName)}
      >
        <DialogHeader className="border-b border-line px-6 py-4">
          <DialogTitle className="text-[15px] font-semibold">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-[12.5px] text-text-soft">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-x-hidden overflow-y-auto"
        >
          {errorMessage ? (
            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-4 px-6 py-5">{children}</div>
          {footer !== undefined ? (
            footer
          ) : (
            <DialogFooter className="border-t border-line bg-line-soft/40 px-6 py-3">
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
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
