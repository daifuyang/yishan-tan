import type * as React from "react";

import { cn } from "@/lib/utils";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: shadcn primitive; consumer provides htmlFor or nests a control.
    <label
      data-slot="label"
      className={cn(
        "text-xs font-normal leading-none text-text-soft select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
