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
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmTone = "default" | "danger";

type ConfirmOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  content?: React.ReactNode;
};

type PendingConfirm = {
  options: Required<Pick<ConfirmOptions, "title" | "confirmLabel" | "cancelLabel" | "tone">> &
    Omit<ConfirmOptions, "title" | "confirmLabel" | "cancelLabel" | "tone">;
  resolve: (ok: boolean) => void;
};

type ConfirmElementProps = {
  pending: PendingConfirm | null;
  onCancel: () => void;
};

function ConfirmElement({ pending, onCancel }: ConfirmElementProps) {
  const [loading, setLoading] = React.useState(false);

  const resetLoading = React.useCallback((_: PendingConfirm | null) => {
    setLoading(false);
  }, []);

  React.useEffect(() => {
    resetLoading(pending);
  }, [pending, resetLoading]);

  if (!pending) return null;
  const { options, resolve } = pending;
  const Icon = options.icon ?? (options.tone === "danger" ? AlertTriangle : CircleHelp);

  const handleConfirm = async () => {
    setLoading(true);
    resolve(true);
  };

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        if (!next && !loading) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader className="flex-row items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              options.tone === "danger"
                ? "bg-destructive/10 text-destructive"
                : "bg-brand-50 text-brand-700",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <AlertDialogTitle>{options.title}</AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            ) : null}
            {options.content}
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onCancel}>
            {options.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(options.tone === "danger" && buttonVariants({ variant: "destructive" }))}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {loading ? "处理中…" : options.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function useConfirm() {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const resolveRef = React.useRef<((ok: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({
        options: {
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel ?? "确认",
          cancelLabel: opts.cancelLabel ?? "取消",
          tone: opts.tone ?? "default",
          icon: opts.icon,
          content: opts.content,
        },
        resolve: (ok) => {
          resolveRef.current = null;
          resolve(ok);
          setPending(null);
        },
      });
    });
  }, []);

  const handleCancel = React.useCallback(() => {
    if (pending) {
      pending.resolve(false);
    }
  }, [pending]);

  const ConfirmMount = React.useCallback(
    () => <ConfirmElement pending={pending} onCancel={handleCancel} />,
    [pending, handleCancel],
  );

  return { confirm, ConfirmElement: ConfirmMount };
}

export type { ConfirmTone, ConfirmOptions };
