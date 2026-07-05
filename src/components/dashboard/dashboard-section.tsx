import type * as React from "react";

import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-text-strong">{title}</h2>
          {description ? <p className="mt-1 text-[13px] text-text-soft">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
