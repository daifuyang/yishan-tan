import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <h1 className="text-3xl font-semibold mb-3">Yishan Tan</h1>
      <p className="text-muted-foreground mb-6">TanStack Start 企业级底座</p>
      <a
        href="/api/health"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
      >
        检查 /api/health
      </a>
    </main>
  );
}
