import { Typography } from "@/components/nowts/typography";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInWithEmailOTP } from "@public-site/auth/signin/_components/sign-in-otp-form";
import { createFileRoute } from "@tanstack/react-router";

type OtpSearch = {
  callbackUrl?: string;
  email?: string;
};

export const Route = createFileRoute("/auth/signin/otp")({
  validateSearch: (search: Record<string, unknown>): OtpSearch => ({
    callbackUrl:
      typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  component: AuthSignInOtpRoute,
});

function AuthSignInOtpRoute() {
  const search = Route.useSearch();

  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in with code</CardTitle>
          <CardDescription>
            Enter your email to receive a one-time sign-in code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInWithEmailOTP
            callbackUrl={search.callbackUrl}
            email={search.email}
          />
          <Typography variant="muted" className="text-center text-xs">
            The code expires shortly after it is sent.
          </Typography>
        </CardContent>
      </Card>
    </main>
  );
}
