import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[4px] text-sm font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700",
        destructive: "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive",
        outline:
          "border border-line bg-white text-text-strong hover:border-brand-500 hover:text-brand-600",
        secondary:
          "border border-line bg-white text-text-strong hover:border-brand-500 hover:text-brand-600",
        ghost: "text-text-soft hover:bg-line-soft hover:text-text-strong",
        link: "text-brand-600 underline-offset-4 hover:text-brand-700 hover:underline",
        light: "bg-white/12 text-white border border-white/30 hover:bg-white/20",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-8 px-3",
        lg: "h-9 px-4",
        xl: "h-10 px-5 text-[15px]",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
