import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 gap-3">
      <h1 className="text-3xl font-semibold mb-3">Yishan Tan</h1>
      <p className="text-muted-foreground mb-6">TanStack Start 企业级底座</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/admin">进入后台</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/health">检查 /api/health</a>
        </Button>
      </div>
    </main>
  );
}
