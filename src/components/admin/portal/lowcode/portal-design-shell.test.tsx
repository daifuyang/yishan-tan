// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { LowcodePageSchema } from "./engine";
import { PortalDesignShell } from "./portal-design-shell";

// 引擎只能进浏览器、体量也大：用一个只暴露「预览 / 保存」两个入口的替身代替设计器
vi.mock("./portal-template-designer", () => ({
  PortalTemplateDesigner: (props: {
    schema: unknown;
    onSave: (schema: unknown) => void;
    onPreview?: (schema: unknown) => void;
  }) =>
    React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        { type: "button", onClick: () => props.onPreview?.(props.schema) },
        "点预览",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => void Promise.resolve(props.onSave(props.schema)).catch(() => {}),
        },
        "点保存",
      ),
    ),
}));
vi.mock("./preview-canvas", () => ({
  PortalPreviewCanvas: () => React.createElement("div", { "data-testid": "preview-canvas" }),
}));
vi.mock("./engine", () => ({ loadLowcodeEngine: () => Promise.resolve({}) }));

const SCHEMA = {
  version: "1.0.0",
  componentsMap: [],
  componentsTree: { id: "root", componentName: "Page" },
} as unknown as LowcodePageSchema;

function setup(props: Partial<React.ComponentProps<typeof PortalDesignShell>> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(
    <PortalDesignShell
      documentId="doc-1"
      noun="页面"
      loading={false}
      error={null}
      schema={SCHEMA}
      onSave={onSave}
      {...props}
    />,
  );
  return { onSave };
}

const overlay = () => screen.queryByRole("button", { name: "返回" });

describe("预览：先落库再预览", () => {
  it("点预览先调 onPreview（落库），成功后才打开预览层", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => {};
    const onPreview = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    setup({ onPreview });

    await user.click(screen.getByText("点预览"));
    expect(onPreview).toHaveBeenCalledWith(SCHEMA);
    // 落库还没完成：预览层不能提前出现
    expect(overlay()).toBeNull();

    finish();
    await waitFor(() => expect(overlay()).not.toBeNull());
    expect(screen.getByTestId("preview-canvas")).toBeInTheDocument();
  });

  it("落库失败：右上角报错，且不进入预览（不预览一份没存下来的内容）", async () => {
    const user = userEvent.setup();
    setup({ onPreview: vi.fn().mockRejectedValue(new Error("全站公共布局已被其他人修改")) });

    await user.click(screen.getByText("点预览"));
    expect(await screen.findByText("全站公共布局已被其他人修改")).toBeInTheDocument();
    expect(overlay()).toBeNull();
  });

  it("失败后可以重试：再次点预览会清掉旧错误并重新落库", async () => {
    const user = userEvent.setup();
    const onPreview = vi
      .fn()
      .mockRejectedValueOnce(new Error("网络错误"))
      .mockResolvedValueOnce(undefined);
    setup({ onPreview });

    await user.click(screen.getByText("点预览"));
    expect(await screen.findByText("网络错误")).toBeInTheDocument();
    await user.click(screen.getByText("点预览"));
    await waitFor(() => expect(overlay()).not.toBeNull());
    expect(screen.queryByText("网络错误")).toBeNull();
    expect(onPreview).toHaveBeenCalledTimes(2);
  });

  it("抛的不是 Error 时用兜底文案，不白屏", async () => {
    const user = userEvent.setup();
    setup({ onPreview: vi.fn().mockRejectedValue("boom") });
    await user.click(screen.getByText("点预览"));
    expect(await screen.findByText("页面保存失败，无法预览")).toBeInTheDocument();
  });

  it("不传 onPreview 时直接预览编辑器里此刻的内容", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("点预览"));
    await waitFor(() => expect(overlay()).not.toBeNull());
  });

  it("预览不触发「保存」出口：预览只走 onPreview", async () => {
    const user = userEvent.setup();
    const { onSave } = setup({ onPreview: vi.fn().mockResolvedValue(undefined) });
    await user.click(screen.getByText("点预览"));
    await waitFor(() => expect(overlay()).not.toBeNull());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("预览层只有一个「返回」按钮（没有标题），点它回到编辑", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("点预览"));
    const back = await screen.findByRole("button", { name: "返回" });
    expect(screen.queryByText("预览")).toBeNull();
    await user.click(back);
    expect(overlay()).toBeNull();
  });
});

describe("保存", () => {
  it("点保存走 onSave；失败时右上角提示", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("保存失败了"));
    setup({ onSave });
    await user.click(screen.getByText("点保存"));
    expect(await screen.findByText("保存失败了")).toBeInTheDocument();
  });
});
