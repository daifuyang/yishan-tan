import { describe, expect, it } from "vitest";

import {
  RADIO_MAX_LABEL_CHARS,
  RADIO_MAX_OPTIONS,
  enumProp,
  enumSetterFor,
  propOptions,
} from "./block-kit";
import { siteBlockMetas } from "./index";

const opts = (...labels: string[]) =>
  labels.map((label, index) => ({ label, value: String(index) }));

describe("枚举属性的控件选择：单选按钮 or 下拉", () => {
  it("选项少且文字短：单选按钮", () => {
    expect(enumSetterFor(opts("浅色", "深色", "透明"))).toBe("RadioGroupSetter");
    expect(enumSetterFor(opts("线条", "卡片", "胶囊"))).toBe("RadioGroupSetter");
    expect(enumSetterFor(opts("靠左", "居中", "靠右"))).toBe("RadioGroupSetter");
    expect(enumSetterFor(opts("开", "关"))).toBe("RadioGroupSetter");
  });

  it("选项多（超过 3 个）：下拉，哪怕每个都很短", () => {
    expect(enumSetterFor(opts("一", "二", "三", "四"))).toBe("SelectSetter");
  });

  it("文字长（总字数超过 9）：下拉，哪怕只有 3 个", () => {
    expect(enumSetterFor(opts("标准导航", "居中品牌", "极简导航"))).toBe("SelectSetter");
  });

  it("边界：恰好 3 个选项、总 9 个字仍是单选；多 1 个字就是下拉", () => {
    expect(RADIO_MAX_OPTIONS).toBe(3);
    expect(RADIO_MAX_LABEL_CHARS).toBe(9);
    expect(enumSetterFor(opts("甲乙丙", "丁戊己", "庚辛壬"))).toBe("RadioGroupSetter");
    expect(enumSetterFor(opts("甲乙丙", "丁戊己", "庚辛壬癸"))).toBe("SelectSetter");
  });

  it("按字符数而不是 UTF-16 长度算（带 emoji / 补充平面字符不会被多算）", () => {
    expect(enumSetterFor(opts("😀😀😀", "😀😀😀", "😀😀😀"))).toBe("RadioGroupSetter");
  });

  it("没有选项时不崩溃", () => {
    expect(enumSetterFor([])).toBe("RadioGroupSetter");
  });

  it("enumProp 把选择结果写进属性描述，选项与默认值原样保留", () => {
    const radio = enumProp(
      "样式",
      "外观",
      "line",
      propOptions(["line", "card"], { line: "线条", card: "卡片" }),
    );
    expect(radio).toMatchObject({
      type: "string",
      defaultValue: "line",
      setter: "RadioGroupSetter",
    });
    expect(radio.options).toEqual([
      { label: "线条", value: "line" },
      { label: "卡片", value: "card" },
    ]);
    const select = enumProp(
      "布局",
      "布局",
      "a",
      opts("标准导航", "居中品牌", "极简导航", "双层导航"),
    );
    expect(select.setter).toBe("SelectSetter");
  });
});

describe("所有区块物料的枚举属性", () => {
  const enumProps = siteBlockMetas.flatMap((meta) =>
    Object.entries(meta.props)
      .filter(([, prop]) => prop.options && prop.options.length > 0)
      .map(([key, prop]) => ({ name: `${meta.componentName}.${key}`, prop })),
  );

  it("至少覆盖到了选项卡样式等枚举", () => {
    const names = enumProps.map((item) => item.name);
    for (const expected of ["Tabs.variant", "Tabs.align"]) {
      expect(names).toContain(expected);
    }
  });

  it("每个枚举属性的控件都符合规则：放不下单选的一定是下拉，不会再把面板挤坏", () => {
    for (const { name, prop } of enumProps) {
      expect(prop.setter, `${name} 用了不合适的控件`).toBe(enumSetterFor(prop.options ?? []));
    }
  });

  it("选项少而短的仍是单选按钮（选项卡样式 / 对齐）", () => {
    const tabs = siteBlockMetas.find((m) => m.componentName === "Tabs");
    expect(tabs?.props.variant?.setter).toBe("RadioGroupSetter");
    expect(tabs?.props.align?.setter).toBe("RadioGroupSetter");
  });
});
