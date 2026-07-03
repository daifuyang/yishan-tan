import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          ok: true,
          service: "yishan-tan",
          time: new Date().toISOString(),
        });
      },
    },
  },
});
