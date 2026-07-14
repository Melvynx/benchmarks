import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth/verify")({
  component: AuthVerifyRoute,
});

function AuthVerifyRoute() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <MailCheck className="text-primary size-10" />
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Open the verification email we sent, then return to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Typography variant="muted">
            If you already verified your email, sign in again to open your
            workspace.
          </Typography>
          <Button asChild className="w-full">
            <Link to="/auth/signin">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
