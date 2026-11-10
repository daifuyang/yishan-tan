import { describe, expect, it } from "vitest";

import { checkListSource } from "../../scripts/arch/check-list-pages.mjs";

describe("check-list-pages", () => {
  it("recognizes aliased ResourcePage and rejects missing query handlers", () => {
    const source = `import { ResourcePage as List } from '@/components/admin/layout';
    const Page = () => <List filter={<div />} filterValues={{}} onFilterSubmit={() => {}}
      onFilterReset={() => {}} toolbarTitle="列表" tableProps={{}} />;`;
    expect(checkListSource(source, "list.tsx")).toEqual([]);
    expect(
      checkListSource(
        source.replace("onFilterSubmit={() => {}}", "onFilterSubmit={undefined}"),
        "list.tsx",
      )[0],
    ).toMatch(/onFilterSubmit/);
  });

  it("accepts the direct resource-page module path", () => {
    const source = `import { ResourcePage } from '@/components/admin/layout/resource-page';
    const Page = () => <ResourcePage filter={<div />} filterValues={{}} onFilterSubmit={() => {}}
      onFilterReset={() => {}} toolbarTitle="列表" tableProps={{}} />;`;
    expect(checkListSource(source, "list.tsx")).toEqual([]);
  });

  it("requires list pages to use the shared ResourcePage", () => {
    const source = `import { PageHeader } from '@/components/admin/layout';
    import { FilterBar, ResourceTable } from '@/components/admin/data-table';
    const Page = () => <><PageHeader /><FilterBar /><ResourceTable /></>;`;
    const issues = checkListSource(source, "list.tsx");
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/ResourcePage/);
  });

  it("ignores lookalike component names imported from other modules", () => {
    const issues = checkListSource(
      `import { ResourcePage } from './fake';
    const Page = () => <ResourcePage />`,
      "list.tsx",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/ResourcePage/);
  });
});
