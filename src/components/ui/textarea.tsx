import type { ComponentProps } from "react";

import { cn } from "~/lib/utils";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-line flex min-h-20 w-full rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}
