import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type QueryFormItemProps = {
  label: React.ReactNode;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
};

export function QueryFormItem({
  label,
  htmlFor,
  className,
  labelClassName,
  children,
}: QueryFormItemProps) {
  return (
    <div
      className={cn("grid min-w-0 grid-cols-[92px_minmax(0,1fr)] items-center gap-3", className)}
    >
      <Label
        htmlFor={htmlFor}
        className={cn("text-right text-[13px] leading-8 text-text-strong", labelClassName)}
      >
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
