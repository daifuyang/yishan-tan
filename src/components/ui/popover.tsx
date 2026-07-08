"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverPortal = PopoverPrimitive.Portal;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Content>;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, sideOffset = 6, align = "start", ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      data-slot="popover-content"
      sideOffset={sideOffset}
      align={align}
      className={cn(
        "z-50 rounded-[6px] border border-line bg-white text-text-strong shadow-card-hover outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[closed]:fade-out-0 data-[open]:fade-in-0",
        "data-[closed]:zoom-out-95 data-[open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverAnchor, PopoverClose, PopoverContent, PopoverPortal, PopoverTrigger };
