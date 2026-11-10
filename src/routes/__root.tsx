import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import * as React from "react";

import { initAnalytics, trackPageView } from "~/lib/analytics/events";

import "@/styles/globals.css";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yishan Tan" },
      { name: "description", content: "Yishan Tan 企业级 TanStack Start 底座" },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AnalyticsMount />
      <Outlet />
    </RootDocument>
  );
}

/**
 * 埋点挂载点：根路由是全站唯一的客户端常驻位置，埋点初始化与页面浏览上报都放这里。
 *
 * 埋点本身是 fire-and-forget：没有任何第三方接收端时事件只是派发 DOM 事件
 * `yishan:analytics`，接入统计服务时监听该事件即可，无需改动调用点。
 */
function AnalyticsMount() {
  const location = useLocation();

  React.useEffect(() => {
    initAnalytics();
  }, []);

  React.useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}

function NotFoundComponent() {
  return (
    <RootDocument>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <h1>404</h1>
        <p>页面未找到</p>
      </div>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext();
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
