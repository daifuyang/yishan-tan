import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CapabilityCardProps = {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  className?: string;
};

export function CapabilityCard({
  title,
  description,
  badge,
  icon: Icon,
  className,
}: CapabilityCardProps) {
  return (
    <div className={cn("yt-card yt-card-hover relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-brand-100 bg-brand-50 text-brand-700"
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <Badge variant="glow">{badge}</Badge>
      </div>

      <h3 className="mt-4 text-[15px] font-semibold text-text-strong">{title}</h3>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-text-soft">{description}</p>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 bottom-0 h-[2px] bg-brand-divider opacity-80"
      />
    </div>
  );
}
