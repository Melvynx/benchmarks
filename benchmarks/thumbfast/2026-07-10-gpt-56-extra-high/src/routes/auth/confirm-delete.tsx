import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/confirm-delete")({
  component: ConfirmDeleteRoute,
});

function ConfirmDeleteRoute() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm account deletion</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              window.location.href = `/api/auth/delete-user/callback?token=${encodeURIComponent(token)}&callbackURL=/auth/goodbye`;
            }}
          >
            Yes, Delete My Account
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
