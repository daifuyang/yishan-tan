import { describe, expect, it } from "vitest";
import { buildTree, collectMenuPaths } from "~/features/menus/menus.service";
import type { MenuDto, MenuNode } from "~/features/menus/menus.types";

function makeMenu(over: Partial<MenuDto>): MenuDto {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    parentId: null,
    name: "X",
    path: null,
    component: null,
    icon: null,
    type: "menu",
    permission: null,
    sort: 0,
    status: "enabled",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function toNode(dto: MenuDto, children: MenuNode[] = []): MenuNode {
  return { ...dto, children };
}

describe("buildTree", () => {
  it("returns roots when no parent links exist", () => {
    const tree = buildTree([makeMenu({ id: "a" }), makeMenu({ id: "b" })]);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.children).toEqual([]);
  });

  it("nests children under parents", () => {
    const tree = buildTree([makeMenu({ id: "root" }), makeMenu({ id: "child", parentId: "root" })]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("root");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("child");
  });

  it("handles multi-level nesting", () => {
    const tree = buildTree([
      makeMenu({ id: "a" }),
      makeMenu({ id: "b", parentId: "a" }),
      makeMenu({ id: "c", parentId: "b" }),
    ]);
    expect(tree[0]?.children[0]?.children[0]?.id).toBe("c");
  });

  it("drops references to missing parents and treats them as roots", () => {
    const tree = buildTree([makeMenu({ id: "a" }), makeMenu({ id: "b", parentId: "missing" })]);
    expect(tree).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(buildTree([])).toEqual([]);
  });

  it("does not mutate input items", () => {
    const items = [makeMenu({ id: "a" }), makeMenu({ id: "b", parentId: "a" })];
    buildTree(items);
    const first = items[0] as MenuDto & { children?: unknown };
    expect(first.children).toBeUndefined();
  });
});

describe("collectMenuPaths", () => {
  it("returns an empty array when no paths are set", () => {
    expect(collectMenuPaths([])).toEqual([]);
  });

  it("collects paths from a flat tree", () => {
    const tree = [
      toNode(makeMenu({ id: "a", path: "/a" })),
      toNode(makeMenu({ id: "b", path: "/b" })),
    ];
    expect(collectMenuPaths(tree).sort()).toEqual(["/a", "/b"]);
  });

  it("walks children", () => {
    const tree = [
      toNode(makeMenu({ id: "a", path: "/a" }), [toNode(makeMenu({ id: "b", path: "/a/b" }))]),
    ];
    expect(collectMenuPaths(tree).sort()).toEqual(["/a", "/a/b"]);
  });

  it("dedupes identical paths", () => {
    const tree = [
      toNode(makeMenu({ id: "a", path: "/x" })),
      toNode(makeMenu({ id: "b", path: "/x" })),
    ];
    expect(collectMenuPaths(tree)).toEqual(["/x"]);
  });

  it("skips nodes with empty/null paths", () => {
    const tree = [
      toNode(makeMenu({ id: "a", path: null })),
      toNode(makeMenu({ id: "b", path: "/y" })),
    ];
    expect(collectMenuPaths(tree)).toEqual(["/y"]);
  });
});
