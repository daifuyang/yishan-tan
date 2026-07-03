/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";

import "~/styles/globals.css";

declare module "@tanstack/react-router" {
  interface RouterContext {
    queryClient: QueryClient;
  }
}
