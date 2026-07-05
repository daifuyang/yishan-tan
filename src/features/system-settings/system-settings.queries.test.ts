import { describe, expect, it } from "vitest";

const { systemSettingsQueryKey, systemOptionGroupQueryOptions } = await import(
  "~/features/system-settings/system-settings.queries"
);

describe("system-settings.queries", () => {
  describe("systemSettingsQueryKey", () => {
    it("'all' is the root prefix", () => {
      expect(systemSettingsQueryKey.all[0]).toBe("system-settings");
    });

    it("group(code) includes 'group' segment and the code", () => {
      const key = systemSettingsQueryKey.group("site");
      expect(key).toContain("group");
      expect(key[key.length - 1]).toBe("site");
      expect(key[0]).toBe("system-settings");
    });

    it("groups() is a parent of group(code)", () => {
      const groupsKey = systemSettingsQueryKey.groups();
      const groupKey = systemSettingsQueryKey.group("site");
      // 前缀匹配：groupKey 以 groupsKey 全前缀开头
      expect(groupKey.slice(0, groupsKey.length)).toEqual(groupsKey);
    });
  });

  describe("systemOptionGroupQueryOptions", () => {
    it("uses 30s staleTime baseline", () => {
      const options = systemOptionGroupQueryOptions("site");
      expect(options.staleTime).toBe(30_000);
    });

    it("disables refetchOnWindowFocus", () => {
      const options = systemOptionGroupQueryOptions("site");
      expect(options.refetchOnWindowFocus).toBe(false);
    });

    it("is disabled for unknown group codes", () => {
      const options = systemOptionGroupQueryOptions("not-a-real-group");
      expect(options.enabled).toBe(false);
    });

    it("is enabled for a known group code", () => {
      const options = systemOptionGroupQueryOptions("site");
      expect(options.enabled).toBe(true);
    });
  });
});
