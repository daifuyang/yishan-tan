import { cn } from "@/lib/utils";

type GlowCubeProps = {
  className?: string;
};

/**
 * 纯 CSS 实现的发光立方体装饰。
 * 不依赖任何图片资源；用于 Hero 右侧视觉点缀。
 */
export function GlowCube({ className }: GlowCubeProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none relative h-[220px] w-[220px] sm:h-[260px] sm:w-[260px]",
        className,
      )}
    >
      {/* 背景光晕 */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.32)_0%,rgba(5,97,242,0.18)_38%,transparent_72%)] blur-2xl" />

      {/* 节点 / 网格 */}
      <svg
        viewBox="0 0 220 220"
        className="absolute inset-0 h-full w-full text-white/35"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
        aria-hidden="true"
      >
        <title>科技网格装饰</title>
        <defs>
          <pattern id="glow-cube-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M 22 0 L 0 0 0 22" />
          </pattern>
        </defs>
        <rect width="220" height="220" fill="url(#glow-cube-grid)" opacity="0.5" />
        <circle cx="36" cy="44" r="1.6" fill="currentColor" />
        <circle cx="180" cy="32" r="1.6" fill="currentColor" />
        <circle cx="200" cy="160" r="1.6" fill="currentColor" />
        <circle cx="48" cy="190" r="1.6" fill="currentColor" />
        <path d="M36 44 L120 100" strokeDasharray="3 4" />
        <path d="M180 32 L120 100" strokeDasharray="3 4" />
        <path d="M200 160 L120 100" strokeDasharray="3 4" />
        <path d="M48 190 L120 100" strokeDasharray="3 4" />
      </svg>

      {/* 中心立方体 */}
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 sm:h-36 sm:w-36">
        <div
          className="relative h-full w-full animate-[yt-cube-float_6s_ease-in-out_infinite] rounded-2xl bg-brand-primary-gradient shadow-[0_18px_48px_rgba(5,97,242,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-tech-grid opacity-40 mix-blend-overlay" />
          <span className="pointer-events-none absolute inset-x-3 top-3 h-px bg-white/40" />
          <span className="pointer-events-none absolute inset-y-3 left-3 w-px bg-white/30" />
        </div>
        {/* 发光底座 */}
        <span
          aria-hidden
          className="absolute -bottom-3 left-1/2 h-3 w-3/4 -translate-x-1/2 rounded-[50%] bg-cyan-glow/70 blur-md"
        />
      </div>

      {/* 浮动的小立方体 */}
      <div className="absolute right-6 top-10 h-6 w-6 rotate-12 rounded-md border border-white/40 bg-white/10 shadow-[0_0_24px_rgba(34,211,238,0.45)] backdrop-blur-sm" />
      <div className="absolute left-4 bottom-12 h-4 w-4 -rotate-12 rounded-md border border-white/40 bg-brand-500/40 shadow-[0_0_18px_rgba(5,97,242,0.6)] backdrop-blur-sm" />
    </div>
  );
}
