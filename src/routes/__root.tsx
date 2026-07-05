import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

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
      <Outlet />
    </RootDocument>
  );
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
