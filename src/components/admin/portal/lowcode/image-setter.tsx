/**
 * 图片属性的编辑器：预览 + 地址输入 + 上传 + 清除。
 *
 * 注册为引擎的 `ImageSetter`（见 `engine.ts`），物料 meta 里写 `setter: "ImageSetter"` 即可用。
 * 它跑在引擎自己的 React root 里，拿不到宿主的上下文，所以不依赖 context / 路由 / 查询缓存。
 *
 * **不另起上传服务**：上传直接 POST 项目已有的 `/api/uploads`（附件模块的上传端点，走默认存储驱动、
 * 落一条附件记录），拿到返回的 `url` 写回属性。没有权限 / 没配存储时端点会报错，这里把原因显示出来，
 * 用户仍然可以手动粘贴图片地址。
 *
 * 提交的值一律经过 `safeImageSrc` 校验（http(s) / 站内路径 / 内联位图），不合法的不写进 schema。
 * 清空 = 提交 `undefined`，属性被移除，区块自动回到图片占位。
 */
import * as React from "react";

import { safeImageSrc } from "./blocks/block-safe";

/** 引擎传给自定义 Setter 的上下文里，这里用到的部分。 */
export interface ImageSetterProps {
  value: unknown;
  onCommit: (value: unknown) => void;
  disabled?: boolean;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const UPLOAD_ENDPOINT = "/api/uploads";
const ADDRESS_HINT = "仅支持 http(s) 地址、站内路径（以 / 开头）或内联位图";

interface UploadResponse {
  ok?: boolean;
  data?: { url?: string };
  error?: string;
}

/** 上传一张图片：成功返回地址，失败抛带原因的 Error。导出供测试直接调用。 */
export async function uploadImage(file: File, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("图片不能超过 10MB");
  const form = new FormData();
  form.append("file", file);
  const response = await fetchImpl(UPLOAD_ENDPOINT, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  let body: UploadResponse | null = null;
  try {
    body = (await response.json()) as UploadResponse;
  } catch {
    body = null;
  }
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || `上传失败（${response.status}）`);
  }
  const url = safeImageSrc(body.data?.url);
  if (!url) throw new Error("上传成功但返回的图片地址不可用");
  return url;
}

export function ImageSetter({ value, onCommit, disabled }: ImageSetterProps) {
  const current = typeof value === "string" ? value : "";
  const previewSrc = safeImageSrc(current);
  const [draft, setDraft] = React.useState(current);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // 外部改了值（撤销 / 重做 / 换节点）时同步输入框，并重新尝试加载预览
  React.useEffect(() => {
    setDraft(current);
    setPreviewFailed(false);
    setError(null);
  }, [current]);

  const commitDraft = () => {
    const next = draft.trim();
    if (next === current) return;
    if (!next) {
      setError(null);
      onCommit(undefined);
      return;
    }
    const safe = safeImageSrc(next);
    if (!safe) {
      setError(ADDRESS_HINT);
      return;
    }
    setError(null);
    onCommit(safe);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // 允许再次选同一个文件
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onCommit(await uploadImage(file));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const busy = disabled || uploading;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div
        className="flex h-20 items-center justify-center overflow-hidden rounded-md border border-dashed border-[#c3d4f7] bg-[#f5f8ff] text-xs text-[#6b88bf]"
        data-testid="image-setter-preview"
      >
        {previewSrc && !previewFailed ? (
          <img
            src={previewSrc}
            alt="已选图片预览"
            className="h-full w-full object-contain"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <span>{previewSrc ? "图片加载失败" : "未选择图片"}</span>
        )}
      </div>

      <input
        type="text"
        value={draft}
        disabled={busy}
        placeholder="粘贴图片地址，回车确认"
        aria-label="图片地址"
        className="h-7 w-full min-w-0 rounded-md border border-[#dee0e3] bg-white px-2 text-xs outline-none focus:border-[#0089ff] disabled:opacity-60"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitDraft();
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          className="h-7 flex-1 cursor-pointer rounded-md border border-[#dee0e3] bg-white text-xs hover:border-[#0089ff] hover:text-[#0089ff] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "上传中…" : "上传图片"}
        </button>
        <button
          type="button"
          disabled={busy || current === ""}
          className="h-7 cursor-pointer rounded-md border border-[#dee0e3] bg-white px-3 text-xs hover:border-[#f54a45] hover:text-[#f54a45] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setError(null);
            onCommit(undefined);
          }}
        >
          清除
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          aria-label="选择要上传的图片"
          onChange={handleFile}
        />
      </div>

      {error ? (
        <p role="alert" className="m-0 text-xs leading-4 text-[#f54a45]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
