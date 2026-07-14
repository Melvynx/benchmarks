import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/goodbye")({
  component: GoodbyeRoute,
});

function GoodbyeRoute() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Account Deleted</CardTitle>
        </CardHeader>
      </Card>
    </main>
  );
}
