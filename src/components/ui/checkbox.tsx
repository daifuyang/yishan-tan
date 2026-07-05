"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[5px] border border-line bg-white shadow-sm transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white",
        "data-[state=indeterminate]:border-brand-600 data-[state=indeterminate]:bg-brand-600 data-[state=indeterminate]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
