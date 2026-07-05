import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-text-mute selection:bg-brand-100 selection:text-brand-700 border-line flex h-8 w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
