import { describe, expect, it } from "vitest";
import {
  buildDepartmentTree,
  isDescendantOfInList,
} from "~/features/departments/departments.service";
import type { DepartmentDto, DepartmentNode } from "~/features/departments/departments.types";

function makeDept(over: Partial<DepartmentDto>): DepartmentDto {
  return {
    id: "123e4567-e89b-12d3-a456-426614174000",
    parentId: null,
    parentName: null,
    name: "X",
    leaderId: null,
    leaderName: null,
    sort: 0,
    status: "enabled",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("buildDepartmentTree", () => {
  it("returns roots when there are no children", () => {
    const tree = buildDepartmentTree([makeDept({ id: "a" }), makeDept({ id: "b" })]);
    expect(tree).toHaveLength(2);
  });

  it("nests children", () => {
    const tree = buildDepartmentTree([
      makeDept({ id: "root" }),
      makeDept({ id: "child", parentId: "root" }),
    ]);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("child");
  });

  it("treats orphan parentIds as roots", () => {
    const tree = buildDepartmentTree([
      makeDept({ id: "a" }),
      makeDept({ id: "b", parentId: "missing" }),
    ]);
    expect(tree).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(buildDepartmentTree([])).toEqual([]);
  });

  it("preserves multi-level hierarchy", () => {
    const tree = buildDepartmentTree([
      makeDept({ id: "r" }),
      makeDept({ id: "c", parentId: "r" }),
      makeDept({ id: "g", parentId: "c" }),
    ]);
    const root = tree[0];
    expect(root?.id).toBe("r");
    expect(root?.children).toHaveLength(1);
    const child = root?.children[0];
    expect(child?.id).toBe("c");
    expect(child?.children).toHaveLength(1);
    expect(child?.children[0]?.id).toBe("g");
  });

  it("produces nodes whose children array is always present", () => {
    const tree: DepartmentNode[] = buildDepartmentTree([
      makeDept({ id: "x" }),
      makeDept({ id: "y", parentId: "x" }),
    ]);
    for (const node of tree) {
      expect(Array.isArray(node.children)).toBe(true);
    }
  });
});

describe("isDescendantOfInList", () => {
  const rows = [
    { id: "root", parentId: null },
    { id: "c1", parentId: "root" },
    { id: "c2", parentId: "root" },
    { id: "g1", parentId: "c1" },
    { id: "gg", parentId: "g1" },
  ];

  it("returns false when candidateId equals ancestorId", () => {
    expect(isDescendantOfInList("root", "root", rows)).toBe(false);
  });

  it("returns true when candidate is a direct child", () => {
    expect(isDescendantOfInList("c1", "root", rows)).toBe(true);
  });

  it("returns true when candidate is a deep descendant", () => {
    expect(isDescendantOfInList("gg", "root", rows)).toBe(true);
    expect(isDescendantOfInList("gg", "c1", rows)).toBe(true);
  });

  it("returns false when candidate is unrelated", () => {
    expect(isDescendantOfInList("c2", "c1", rows)).toBe(false);
  });

  it("returns false when ancestor is missing from list", () => {
    expect(isDescendantOfInList("c1", "ghost", rows)).toBe(false);
  });

  it("handles empty list", () => {
    expect(isDescendantOfInList("a", "b", [])).toBe(false);
  });
});

describe("getDepartment service export shape", () => {
  it("exports getDepartmentService as a function", async () => {
    const mod = await import("~/features/departments/departments.service");
    expect(typeof mod.getDepartmentService).toBe("function");
    expect(typeof mod.isDescendantOf).toBe("function");
    expect(typeof mod.isDescendantOfInList).toBe("function");
  });
});
