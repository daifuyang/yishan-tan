import type * as React from "react";

import { GlowCube } from "@/components/brand/glow-cube";
import { cn } from "@/lib/utils";

type TechHeroAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: "primary" | "ghost" | "outline";
};

type TechHeroProps = {
  badge?: string;
  title: string;
  description?: string;
  actions?: TechHeroAction[];
  className?: string;
};

const VARIANT_CLASS: Record<NonNullable<TechHeroAction["variant"]>, string> = {
  primary: "bg-white text-brand-700 shadow-button hover:bg-brand-50 hover:text-brand-800",
  ghost: "bg-white/10 text-white border border-white/30 hover:bg-white/15",
  outline:
    "border border-white/35 bg-transparent text-white hover:border-white/55 hover:bg-white/5",
};

export function TechHero({ badge, title, description, actions, className }: TechHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-brand-gradient p-6 text-white shadow-card sm:p-8",
        className,
      )}
    >
      {/* 网格纹理 + 发光点 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-tech-grid opacity-90" />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-64 w-64 rounded-full bg-cyan-glow/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-[-80px] h-72 w-72 rounded-full bg-brand-500/30 blur-3xl"
      />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 max-w-2xl">
          {badge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/95 backdrop-blur-sm">
              <span className="inline-block size-1.5 rounded-full bg-cyan-glow shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
              {badge}
            </span>
          ) : null}
          <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px] lg:text-[36px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/85 sm:text-[15px]">
              {description}
            </p>
          ) : null}

          {actions && actions.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {actions.map((action) => {
                const className = cn(
                  "inline-flex h-10 items-center gap-2 rounded-[10px] px-5 text-[13px] font-semibold transition-all duration-200",
                  VARIANT_CLASS[action.variant ?? "primary"],
                );
                const content = (
                  <>
                    {action.icon}
                    <span>{action.label}</span>
                  </>
                );
                if (action.href) {
                  return (
                    <a key={action.label} href={action.href} className={className}>
                      {content}
                    </a>
                  );
                }
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={className}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="hidden lg:flex lg:justify-end">
          <GlowCube />
        </div>
      </div>
    </section>
  );
}
