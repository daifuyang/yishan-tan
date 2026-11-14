/**
 * 业务区块模板的类型。
 *
 * 三层职责（不要混）：
 * - Material（物料）：定义一个组件**能做什么**——属性、Setter、渲染实现。一个物料一份。
 * - BlockTemplate（模板）：一套**初始节点树 + 视觉方案**。区块是原子的组合，不是整体的定制组件。
 * - SiteLayout（公共布局）：全站共享的页头 / 页脚内容，见 `portal-content.layout.ts`。
 *
 * 模板**不是**新的 React 组件：Header / Hero 模板拖进画布后，落下的是一棵标准原子节点树
 * （Div / Typography / Link / Image / Navbar），每个节点都能单独选中编辑。所以这里只有数据，
 * 没有任何 React / 引擎依赖，服务端、测试、面板都能直接 import。
 */

/**
 * 模板里的节点：与引擎协议的 `NodeSchema` 同形状，**不含 `id`** ——
 * id 由引擎在插入时为整棵子树重新生成，模板里写的 id 只会被丢弃。
 */
export interface BlockTemplateNode {
  componentName: string;
  /** 大纲里显示的节点名；缺省回落到物料标题 */
  title?: string;
  props?: Record<string, unknown>;
  children?: Array<BlockTemplateNode | string>;
}

export interface BlockTemplate {
  /** 全局唯一，如 `header-standard` */
  id: string;
  /** 面板里卡片的名称 */
  name: string;
  /** 一句话说明，用在悬浮提示与无障碍描述里 */
  description: string;
  /** 分类，必须是 `BLOCK_CATEGORIES` 里的一项 */
  category: string;
  /** 落下的物料，模板根节点的 `componentName` 必须与它一致 */
  componentName: string;
  /** 缩略图：`blocks/thumbnails/` 下的图片文件名（不含扩展名），或一个图片地址（https / 站内路径） */
  thumbnail: string;
  tags?: readonly string[];
  /** 面板里展示「推荐」标识 */
  recommended?: boolean;
  /** 拖入时落下的初始节点树 */
  schema: BlockTemplateNode;
}
