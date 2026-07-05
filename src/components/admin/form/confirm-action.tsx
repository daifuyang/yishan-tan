import { Slot } from "@radix-ui/react-slot";
import { AlertTriangle, CircleHelp } from "lucide-react";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmTone = "default" | "danger";

type ConfirmActionProps = {
  trigger: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
};

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  tone = "default",
  icon,
  onConfirm,
  disabled,
}: ConfirmActionProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const Icon = icon ?? (tone === "danger" ? AlertTriangle : CircleHelp);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={disabled ? undefined : setOpen}>
      <AlertDialogTrigger asChild>
        <Slot onClick={() => setOpen(true)}>{trigger}</Slot>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="flex-row items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-50 text-brand-700",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(tone === "danger" && buttonVariants({ variant: "destructive" }))}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {loading ? "处理中…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { ConfirmTone };
