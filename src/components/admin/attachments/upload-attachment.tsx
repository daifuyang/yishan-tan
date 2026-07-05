import { Loader2, Upload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadResult = {
  ok: boolean;
  data?: { id: string; url: string; name: string };
  error?: string;
};

type UploadAttachmentProps = {
  onUploaded?: () => void;
  /** 接受的文件类型（MIME / 后缀），传给原生 input accept。 */
  accept?: string;
  /** 是否允许多选，默认 true。 */
  multiple?: boolean;
  className?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
};

/**
 * 上传按钮：点击后弹出原生文件选择器，逐个 POST 到 /api/uploads。
 * - 简单失败用 alert 提示（按 checklist 不引新依赖）
 * - onUploaded 在所有文件上传完成后回调一次
 */
export function UploadAttachment({
  onUploaded,
  accept,
  multiple = true,
  className,
  variant = "default",
  size = "sm",
}: UploadAttachmentProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    const failures: string[] = [];
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        try {
          const res = await fetch("/api/uploads", {
            method: "POST",
            body: fd,
            credentials: "include",
          });
          const json = (await res.json().catch(() => null)) as UploadResult | null;
          if (!res.ok || !json?.ok) {
            failures.push(`${file.name}: ${json?.error ?? res.statusText}`);
          }
        } catch (err) {
          failures.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }

    if (failures.length > 0) {
      // eslint-disable-next-line no-alert
      window.alert(`以下文件上传失败：\n${failures.join("\n")}`);
    }

    onUploaded?.();
  };

  return (
    <span className={cn("inline-flex", className)}>
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-3.5" aria-hidden />
        )}
        {uploading ? "上传中" : "上传"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
    </span>
  );
}
