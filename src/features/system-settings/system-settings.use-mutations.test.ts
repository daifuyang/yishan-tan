import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const batchSetMock = vi.fn();

vi.mock("~/features/system-settings/system-settings.actions", () => ({
  batchGetSystemOptions: vi.fn(),
  batchSetSystemOptions: (...args: unknown[]) => batchSetMock(...args),
  getSystemOption: vi.fn(),
  setSystemOption: vi.fn(),
}));

const { useSaveSystemOptionGroup } = await import(
  "~/features/system-settings/system-settings.use-mutations"
);
const { systemSettingsQueryKey } = await import(
  "~/features/system-settings/system-settings.queries"
);

/**
 * 通过把 mock module 加载后再访问 useSaveSystemOptionGroup，验证其产物形状。
 * 由于没有 React renderer，这里只断言关键不变量：queryKey 的层级关系。
 */
describe("system-settings.use-mutations", () => {
  beforeEach(() => {
    batchSetMock.mockReset();
    batchSetMock.mockResolvedValue({ updatedCount: 1, results: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exports useSaveSystemOptionGroup as a function", () => {
    expect(typeof useSaveSystemOptionGroup).toBe("function");
  });

  it("queryKey.group() builds a hierarchical array scoped to one group", () => {
    const groupKey = systemSettingsQueryKey.group("site");
    expect(Array.isArray(groupKey)).toBe(true);
    expect(groupKey[0]).toBe("system-settings");
    expect(groupKey).toContain("site");
  });

  it("invalidating group(site) does NOT remove group(auth) data", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    client.setQueryData(systemSettingsQueryKey.group("site"), [{ key: "site.name", value: "" }]);
    client.setQueryData(systemSettingsQueryKey.group("auth"), [
      { key: "auth.login.maxRetries", value: "5" },
    ]);

    await client.invalidateQueries({ queryKey: systemSettingsQueryKey.group("site") });

    // site group 被标记为 invalid（数据被丢弃，重查时拉新）
    const siteState = client.getQueryState(systemSettingsQueryKey.group("site"));
    expect(siteState?.isInvalidated ?? false).toBe(true);

    // auth group 数据仍在；这里验证两棵 queryKey 互不感知。
    const authData = client.getQueryData(systemSettingsQueryKey.group("auth"));
    expect(authData).toBeDefined();
  });
});
