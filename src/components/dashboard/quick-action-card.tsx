import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type QuickActionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  className?: string;
};

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  className,
}: QuickActionCardProps) {
  const inner = (
    <>
      <span
        aria-hidden
        className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-brand-100 bg-brand-50 text-brand-700 transition-all duration-200 group-hover:bg-brand-primary-gradient group-hover:text-white group-hover:shadow-button"
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[14px] font-semibold text-text-strong">{title}</p>
      <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-text-soft">
        {description}
      </p>
    </>
  );

  const baseClass = cn(
    "group relative flex flex-col rounded-2xl border border-line bg-white p-4 shadow-sm transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-card-hover",
    className,
  );

  if (href) {
    return (
      <a href={href} className={baseClass}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(baseClass, "text-left")}>
      {inner}
    </button>
  );
}
