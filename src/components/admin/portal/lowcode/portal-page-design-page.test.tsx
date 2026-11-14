// @vitest-environment jsdom
import { render } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  composePageSchema,
  decomposePageSchema,
} from "~/features/portal-content/portal-content.layout";
import type { PortalSiteLayoutDto } from "~/features/portal-content/portal-content.types";

import type { LowcodePageSchema } from "./engine";

const mocks = vi.hoisted(() => ({
  page: { data: undefined as unknown, isLoading: false, isError: false, error: null },
  layout: { data: undefined as unknown, isLoading: false, isError: false, error: null },
  mutate: vi.fn(),
  confirm: vi.fn(),
  toastSuccess: vi.fn(),
  shellProps: {} as Record<string, unknown>,
}));

vi.mock("~/features/portal-content/portal-content.queries", () => ({
  usePortalPage: () => mocks.page,
  usePortalSiteLayout: () => mocks.layout,
}));
vi.mock("~/features/portal-content/portal-content.use-mutations", () => ({
  useSavePortalPageDesign: () => ({ mutateAsync: mocks.mutate }),
}));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));
vi.mock("~/components/admin/form/use-confirm", () => ({
  useConfirm: () => ({ confirm: mocks.confirm, ConfirmElement: () => null }),
}));
vi.mock("./portal-design-shell", () => ({
  PortalDesignShell: (props: Record<string, unknown>) => {
    mocks.shellProps = props;
    return React.createElement("div", { "data-testid": "shell" });
  },
  toJsonValue: (value: unknown) => JSON.parse(JSON.stringify(value)),
  toLowcodePageSchema: (value: unknown) => value,
}));
vi.mock("./engine", () => ({}));

const { PortalPageDesignPage } = await import("./portal-page-design-page");

const hdr = (label: string) => ({
  id: "site_header",
  componentName: "SiteHeader",
  props: { brandText: label },
});

function layoutDto(overrides: Partial<PortalSiteLayoutDto> = {}): PortalSiteLayoutDto {
  return {
    key: "default",
    initialized: true,
    version: 3,
    draftHeader: [hdr("线上版")] as never,
    publishedHeader: [hdr("线上版")] as never,
    draftFooter: [],
    publishedFooter: [],
    unpublishedChanges: false,
    publishTime: null,
    updatedAt: null,
    ...overrides,
  };
}

/** 编辑器里此刻的完整 Schema：用 `label` 当页头品牌名，模拟用户改页头。 */
function editorSchema(label: string): LowcodePageSchema {
  return composePageSchema({
    siteLayout: { draftHeader: [hdr(label)] },
    pageMainSchema: null,
    mode: "draft",
  }) as unknown as LowcodePageSchema;
}

const onPreview = () => mocks.shellProps.onPreview as (s: LowcodePageSchema) => Promise<void>;
const onSave = () => mocks.shellProps.onSave as (s: LowcodePageSchema) => Promise<void>;

function mount() {
  render(<PortalPageDesignPage pageId="page-1" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.page.data = { id: "page-1", draftSchema: null, publishedSchema: null };
  mocks.layout.data = layoutDto();
  mocks.confirm.mockResolvedValue(true);
  // 默认模拟服务端：返回最新的公共布局（版本 +1）；个别用例会覆盖
  mocks.mutate.mockImplementation(async (input: { publish: boolean }) => ({
    layout: layoutDto({
      version: 4,
      publishedHeader: input.publish ? ([hdr("新版")] as never) : ([hdr("线上版")] as never),
    }),
    layoutChanged: true,
  }));
});

describe("预览：存草稿再预览", () => {
  it("预览落库为草稿（publish: false），带上读取时的公共布局版本号，不弹确认", async () => {
    mount();
    await onPreview()(editorSchema("改过的页头"));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    const input = mocks.mutate.mock.calls[0]?.[0];
    expect(input).toMatchObject({ pageId: "page-1", publish: false, expectedLayoutVersion: 3 });
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("落库的是完整 Schema（页头在槽里），由服务端拆分；客户端不自己拆", async () => {
    mount();
    const schema = editorSchema("改过的页头");
    await onPreview()(schema);
    const sent = mocks.mutate.mock.calls[0]?.[0].schema;
    // 页头还在 PageLayout 的 header 槽里（服务端负责拆）
    expect(decomposePageSchema(sent).header).toHaveLength(1);
  });

  it("落库失败：抛给壳，壳负责提示并不进入预览", async () => {
    mocks.mutate.mockRejectedValue(new Error("版本冲突"));
    mount();
    await expect(onPreview()(editorSchema("x"))).rejects.toThrow("版本冲突");
  });

  it("预览后版本号刷新：连续预览带的是服务端返回的最新版本，不会拿旧版本自己跟自己冲突", async () => {
    mount();
    await onPreview()(editorSchema("a"));
    await onPreview()(editorSchema("b"));
    expect(mocks.mutate.mock.calls[0]?.[0].expectedLayoutVersion).toBe(3);
    expect(mocks.mutate.mock.calls[1]?.[0].expectedLayoutVersion).toBe(4);
  });
});

describe("保存（发布）：公共布局与线上不一致时先确认", () => {
  it("改了页头后保存：弹「影响所有页面」确认，确认后以 publish: true 落库", async () => {
    mount();
    await onSave()(editorSchema("新版"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({
      title: "修改全站公共布局",
      description: "当前修改包含全站公共布局，保存后将影响所有页面。",
    });
    expect(mocks.mutate.mock.calls[0]?.[0]).toMatchObject({ publish: true });
  });

  it("取消确认：什么都不写", async () => {
    mocks.confirm.mockResolvedValue(false);
    mount();
    await onSave()(editorSchema("新版"));
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("保存成功：弹一条 toast（保存即发布）；预览落库、保存失败都不弹", async () => {
    mount();
    await onPreview()(editorSchema("线上版"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    await onSave()(editorSchema("线上版"));
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("保存成功");
    mocks.toastSuccess.mockClear();
    mocks.mutate.mockRejectedValue(new Error("版本冲突"));
    await expect(onSave()(editorSchema("线上版"))).rejects.toThrow("版本冲突");
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("没改公共布局（与线上一致）：不弹确认，直接发布", async () => {
    mount();
    await onSave()(editorSchema("线上版"));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.mutate.mock.calls[0]?.[0]).toMatchObject({ publish: true });
  });

  it("【绕过确认的陷阱】先预览（公共布局改动存成了草稿），再保存：仍然要确认", async () => {
    mount();
    // 预览：改了页头，存成草稿（线上没变）
    await onPreview()(editorSchema("新版"));
    expect(mocks.confirm).not.toHaveBeenCalled();
    // 保存：同样的内容，对线上来说仍然是改动，必须确认；
    // 若拿「草稿」当基线，这里会被判断成没改而直接发布，服务端会把待发布的布局草稿一起发布出去
    await onSave()(editorSchema("新版"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[1]?.[0]).toMatchObject({ publish: true });
  });

  it("预览多次再保存，也只在发布时确认一次", async () => {
    mount();
    await onPreview()(editorSchema("新版"));
    await onPreview()(editorSchema("新版"));
    await onSave()(editorSchema("新版"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it("发布成功后基线刷新为新的线上版本：再次保存同样内容不再确认", async () => {
    mount();
    await onSave()(editorSchema("新版"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await onSave()(editorSchema("新版"));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    // 带的是服务端返回的最新版本
    expect(mocks.mutate.mock.calls[1]?.[0].expectedLayoutVersion).toBe(4);
  });

  it("公共布局还没初始化：编辑器用默认页头起步，第一次保存要确认（会让所有页面都有这个页头）", async () => {
    mocks.layout.data = layoutDto({
      initialized: false,
      version: 0,
      draftHeader: [],
      publishedHeader: null,
    });
    mount();
    // 默认页头 id 固定，用户没改它
    const defaultHeader = composePageSchema({
      siteLayout: { draftHeader: [{ id: "site_header_default", componentName: "SiteHeader" }] },
      pageMainSchema: null,
      mode: "draft",
    }) as unknown as LowcodePageSchema;
    await onSave()(defaultHeader);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0]?.[0].expectedLayoutVersion).toBe(0);
  });

  it("扁平页面（没有 PageLayout）不归公共布局管：保存不弹确认", async () => {
    mount();
    const flat = {
      version: "1.0.0",
      componentsMap: [],
      componentsTree: { id: "root", componentName: "Page", children: [] },
    } as unknown as LowcodePageSchema;
    await onSave()(flat);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });
});

describe("加载", () => {
  it("页面或公共布局任一在加载中就是加载态；出错时把错误交给壳", () => {
    mocks.layout.isLoading = true;
    mount();
    expect(mocks.shellProps.loading).toBe(true);
    mocks.layout.isLoading = false;
    mocks.layout.isError = true;
    (mocks.layout as { error: unknown }).error = new Error("加载公共布局失败");
    mount();
    expect(mocks.shellProps.error).toBeInstanceOf(Error);
    mocks.layout.isError = false;
    (mocks.layout as { error: unknown }).error = null;
  });
});
