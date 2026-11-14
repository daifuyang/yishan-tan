import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * 全局 toast 容器（shadcn 推荐的 Sonner）。宪章 §5.3：顶部居中，3s 自动消失。
 * 在需要提示的页面挂一次 `<Toaster />`，任何地方 `import { toast } from "sonner"` 调用即可。
 * 宽度跟文案走（max-content + 不换行），不固定成默认的 356px，也不会被父容器挤成竖排；项目没有暗色主题切换，固定 light，颜色取设计令牌。
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-center"
      duration={3000}
      className="toaster group"
      toastOptions={{ style: { whiteSpace: "nowrap", padding: "10px 16px" } }}
      style={
        {
          "--width": "max-content",
          "--normal-bg": "var(--color-white, #fff)",
          "--normal-text": "var(--color-text-strong)",
          "--normal-border": "var(--color-line)",
          "--success-text": "var(--color-text-strong)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
