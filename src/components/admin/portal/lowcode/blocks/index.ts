/**
 * 业务区块物料包（宿主侧定义，引擎只负责装配）。
 *
 * 描述（metas）与实现（components）成对，由 `createEditor` / `LowcodeRender` 的
 * `packages` 装配。componentName 不得与引擎基础物料重名（见 `index.test.ts` 守卫）。
 */
import "./blocks.css";

import { AnnouncementBar } from "./announcement-bar";
import { announcementBarMeta } from "./announcement-bar.meta";
import { Navbar } from "./navbar";
import { navbarMeta } from "./navbar.meta";
import { PageLayout } from "./page-layout";
import { pageLayoutMeta } from "./page-layout.meta";
import { TabPane, Tabs } from "./tabs";
import { tabPaneMeta, tabsMeta } from "./tabs.meta";

export const SITE_BLOCKS_PACKAGE_ID = "@yishan-tan/site-blocks";

export const siteBlockMetas = [
  pageLayoutMeta,
  announcementBarMeta,
  navbarMeta,
  tabsMeta,
  tabPaneMeta,
];

export const siteBlockComponents = {
  PageLayout,
  AnnouncementBar,
  Navbar,
  Tabs,
  TabPane,
};

/** 物料包形态与引擎 `ReactMaterialPackage` 一致：`{ meta: { id, metas }, components }`。 */
export const siteBlocksPackage = {
  meta: {
    id: SITE_BLOCKS_PACKAGE_ID,
    title: "业务区块",
    version: "0.1.0",
    metas: siteBlockMetas,
  },
  components: siteBlockComponents,
};
