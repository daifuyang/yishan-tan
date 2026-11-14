/**
 * 组件面板的图标表：componentName → lucide 图标。
 *
 * 选 lucide 的理由：项目已依赖（无新增包）、24 格线性风格、统一描边，
 * 14px + 1.5 描边下与钉钉宜搭的细线图标观感最接近。每个组件用**语义上最贴切且互不重复**的
 * 一枚（输入框 / 多行文本 / 下拉 / 表单项不再共用一个矩形）。
 *
 * 新增物料时在这里补一行；`material-panel.test.tsx` 会断言引擎基础组件与宿主容器
 * 都有登记，漏补会直接红，而不是悄悄退回通用方块。
 */
import {
  AlignLeft,
  Box,
  CircleAlert,
  ClipboardList,
  Gauge,
  Image as ImageIcon,
  Inbox,
  Link2,
  type LucideIcon,
  MousePointerClick,
  PanelTop,
  PanelsTopLeft,
  SeparatorHorizontal,
  SquareCheck,
  SquareChevronDown,
  SquareDashed,
  Tag,
  TextCursorInput,
  TextSelect,
  ToggleLeft,
  Type,
} from "lucide-react";

export const COMPONENT_ICONS: Record<string, LucideIcon> = {
  // 布局
  Div: SquareDashed,
  Tabs: PanelsTopLeft,
  TabPane: PanelTop,
  // 表单
  Form: ClipboardList,
  FormItem: TextSelect,
  Input: TextCursorInput,
  TextArea: AlignLeft,
  Select: SquareChevronDown,
  Checkbox: SquareCheck,
  Switch: ToggleLeft,
  // 内容
  Typography: Type,
  Link: Link2,
  Image: ImageIcon,
  Tag,
  Divider: SeparatorHorizontal,
  // 反馈
  Button: MousePointerClick,
  Progress: Gauge,
  Alert: CircleAlert,
  Empty: Inbox,
};

/** 没登记的物料退回的通用图标。 */
export const FALLBACK_ICON: LucideIcon = Box;
