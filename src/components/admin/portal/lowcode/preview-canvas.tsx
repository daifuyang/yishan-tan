import { createClientOnlyFn } from "@tanstack/react-start";
/**
 * 预览画布：用引擎的 render 态渲染一份 PageSchema。
 *
 * 和编辑态共用 `assembleMaterials` + `renderTree` 内核（引擎保证「编辑器里看到什么、
 * 预览里就是什么」），但这里**不引编辑器代码**：只 import 物料包和渲染组件。
 *
 * 引擎包是浏览器端的（Monaco / iframe 画布），所以渲染组件在 `useEffect` 里
 * 动态 import —— SSR 阶段只渲染一个占位。
 */
import * as React from "react";

import type { LowcodeMaterialPackage } from "./engine";

type RenderComponent = React.ComponentType<{
  schema: unknown;
  packages: LowcodeMaterialPackage[];
}>;

const loadRender = createClientOnlyFn(async () => {
  const [render, materials, blocks] = await Promise.all([
    import("@lowcode-next/render-react"),
    import("@lowcode-next/materials-react/basic"),
    import("./blocks"),
  ]);
  return {
    LowcodeRender: render.LowcodeRender as unknown as RenderComponent,
    packages: [
      materials.basicReactMaterialPackage as LowcodeMaterialPackage,
      blocks.siteBlocksPackage as LowcodeMaterialPackage,
    ],
  };
});

export function PortalPreviewCanvas({ schema }: { schema: unknown }) {
  const [Render, setRender] = React.useState<RenderComponent | null>(null);
  const [packages, setPackages] = React.useState<LowcodeMaterialPackage[]>([]);
  const [failed, setFailed] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    void loadRender()
      .then(({ LowcodeRender, packages: loaded }) => {
        if (!alive) return;
        setRender(() => LowcodeRender);
        setPackages(loaded);
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setFailed(error instanceof Error ? error.message : "预览渲染器加载失败");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-destructive">
        {failed}
      </div>
    );
  }

  if (!Render) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-text-soft">
        正在加载预览…
      </div>
    );
  }

  return (
    <div data-lc-preview className="h-full bg-white">
      <Render schema={schema} packages={packages} />
    </div>
  );
}
