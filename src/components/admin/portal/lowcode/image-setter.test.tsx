// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImageSetter, MAX_UPLOAD_BYTES, UPLOAD_ENDPOINT, uploadImage } from "./image-setter";

const png = (name = "a.png", size = 10) => {
  const file = new File(["x".repeat(size)], name, { type: "image/png" });
  return file;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("uploadImage：复用项目现有的 /api/uploads", () => {
  it("POST multipart 到 /api/uploads，带登录态，成功返回附件地址", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ ok: true, data: { id: "1", url: "/uploads/2026/11/a.png", name: "a.png" } }),
      );
    const url = await uploadImage(png(), fetchMock as unknown as typeof fetch);
    expect(url).toBe("/uploads/2026/11/a.png");
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe(UPLOAD_ENDPOINT);
    expect(UPLOAD_ENDPOINT).toBe("/api/uploads");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("不是图片 / 超过 10MB：不发请求，直接报错", async () => {
    const fetchMock = vi.fn();
    await expect(
      uploadImage(
        new File(["x"], "a.pdf", { type: "application/pdf" }),
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow("请选择图片文件");
    const big = png("big.png", 1);
    Object.defineProperty(big, "size", { value: MAX_UPLOAD_BYTES + 1 });
    await expect(uploadImage(big, fetchMock as unknown as typeof fetch)).rejects.toThrow("10MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("服务端报错：把服务端给的原因带出来（无权限 / 没配存储等）", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: false, error: "权限不足" }, 403));
    await expect(uploadImage(png(), fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "权限不足",
    );
  });

  it("响应不是 JSON / 没有错误文案：用状态码兜底", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("oops", { status: 502 }));
    await expect(uploadImage(png(), fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "上传失败（502）",
    );
  });

  it("返回的地址不安全：拒绝，不把它写进 schema", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ok: true, data: { url: "javascript:alert(1)" } }));
    await expect(uploadImage(png(), fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "不可用",
    );
  });

  it("网络异常：向上抛出", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("网络断了"));
    await expect(uploadImage(png(), fetchMock as unknown as typeof fetch)).rejects.toThrow(
      "网络断了",
    );
  });
});

describe("ImageSetter 控件", () => {
  it("空值：显示「未选择图片」，没有 <img>，清除按钮禁用", () => {
    render(<ImageSetter value={undefined} onCommit={() => {}} />);
    expect(screen.getByText("未选择图片")).toBeInTheDocument();
    expect(screen.getByTestId("image-setter-preview").querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "清除" })).toBeDisabled();
  });

  it("有值：显示预览，输入框回填，可以清除", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<ImageSetter value="/uploads/a.png" onCommit={onCommit} />);
    expect(screen.getByAltText("已选图片预览")).toHaveAttribute("src", "/uploads/a.png");
    expect(screen.getByLabelText("图片地址")).toHaveValue("/uploads/a.png");
    await user.click(screen.getByRole("button", { name: "清除" }));
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });

  it("粘贴地址后回车：合法地址提交（去掉两端空白）", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<ImageSetter value="" onCommit={onCommit} />);
    await user.type(screen.getByLabelText("图片地址"), "  https://cdn.example.com/a.png  {Enter}");
    expect(onCommit).toHaveBeenCalledWith("https://cdn.example.com/a.png");
  });

  it("失焦也提交；内容没变不重复提交", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<ImageSetter value="/a.png" onCommit={onCommit} />);
    const input = screen.getByLabelText("图片地址");
    await user.click(input);
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
    await user.clear(input);
    await user.type(input, "/b.png");
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith("/b.png");
  });

  it("非法地址：不提交，提示原因", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<ImageSetter value="" onCommit={onCommit} />);
    await user.type(screen.getByLabelText("图片地址"), "javascript:alert(1){Enter}");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("仅支持");
  });

  it("把输入框清空：等于清除（提交 undefined，区块回到占位）", async () => {
    const onCommit = vi.fn();
    const user = userEvent.setup();
    render(<ImageSetter value="/a.png" onCommit={onCommit} />);
    await user.clear(screen.getByLabelText("图片地址"));
    await user.tab();
    expect(onCommit).toHaveBeenCalledWith(undefined);
  });

  it("预览图加载失败：显示「图片加载失败」，不留破损图标", () => {
    render(<ImageSetter value="/broken.png" onCommit={() => {}} />);
    fireEvent.error(screen.getByAltText("已选图片预览"));
    expect(screen.queryByAltText("已选图片预览")).toBeNull();
    expect(screen.getByText("图片加载失败")).toBeInTheDocument();
  });

  it("值是脏数据（非字符串 / 危险协议）：当空处理，不渲染 <img>", () => {
    for (const bad of [123, {}, "javascript:alert(1)"]) {
      const { unmount } = render(<ImageSetter value={bad} onCommit={() => {}} />);
      expect(screen.getByTestId("image-setter-preview").querySelector("img")).toBeNull();
      unmount();
    }
  });

  it("外部改了值（撤销 / 重做 / 换节点）：输入框同步，并清掉旧的错误提示", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ImageSetter value="" onCommit={() => {}} />);
    await user.type(screen.getByLabelText("图片地址"), "javascript:x{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    rerender(<ImageSetter value="/new.png" onCommit={() => {}} />);
    expect(screen.getByLabelText("图片地址")).toHaveValue("/new.png");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("上传：选文件 → 上传中 → 提交返回的地址", async () => {
    const onCommit = vi.fn();
    let finish: (value: Response) => void = () => {};
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    render(<ImageSetter value="" onCommit={onCommit} />);
    const input = screen.getByLabelText("选择要上传的图片") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [png()] } });
    expect(await screen.findByText("上传中…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传中…" })).toBeDisabled();
    finish(jsonResponse({ ok: true, data: { url: "/uploads/x.png" } }));
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith("/uploads/x.png"));
    expect(screen.getByRole("button", { name: "上传图片" })).toBeEnabled();
    fetchSpy.mockRestore();
  });

  it("上传失败：显示原因，不提交；之后仍可手动粘贴地址", async () => {
    const onCommit = vi.fn();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: false, error: "未配置默认存储" }, 500));
    const user = userEvent.setup();
    render(<ImageSetter value="" onCommit={onCommit} />);
    fireEvent.change(screen.getByLabelText("选择要上传的图片"), { target: { files: [png()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("未配置默认存储");
    expect(onCommit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("图片地址"), "/manual.png{Enter}");
    expect(onCommit).toHaveBeenCalledWith("/manual.png");
    fetchSpy.mockRestore();
  });

  it("禁用时所有操作不可用", () => {
    render(<ImageSetter value="/a.png" onCommit={() => {}} disabled />);
    expect(screen.getByLabelText("图片地址")).toBeDisabled();
    expect(screen.getByRole("button", { name: "上传图片" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "清除" })).toBeDisabled();
  });
});
