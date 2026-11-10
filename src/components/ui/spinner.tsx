import { cn } from "~/lib/utils";

const SPINNER_SIZE = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-9 border-[3px]",
} as const;

export type SpinnerSize = keyof typeof SPINNER_SIZE;

/**
 * 通用加载指示器（参考 antd Spin）：环形旋转 + 可选说明文案。
 * 用于路由切换、会话校验等「首屏还不知道内容」的阶段。
 */
export function Spinner({
  size = "md",
  label = "加载中",
  className,
}: {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}) {
  return (
    <output
      aria-live="polite"
      className={cn("inline-flex items-center justify-center text-primary", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "animate-spin rounded-full border-primary/15 border-t-primary",
          SPINNER_SIZE[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </output>
  );
}

/**
 * 整页加载态：首屏在等待会话/数据结算时占满视口居中展示，
 * 避免出现空白页或粗糙的提示框。
 */
export function PageSpinner({
  tip,
  className,
}: {
  tip?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center gap-3 bg-muted/30",
        className,
      )}
    >
      <Spinner size="lg" label={tip ?? "加载中"} />
      {tip ? (
        <p className="text-sm text-muted-foreground" aria-hidden="true">
          {tip}
        </p>
      ) : null}
    </div>
  );
}
