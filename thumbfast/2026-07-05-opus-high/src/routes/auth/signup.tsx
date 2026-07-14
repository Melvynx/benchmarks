import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { SignUpCredentialsForm } from "@/features/auth/sign-up-credentials-form";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import Link from "@/compat/link";

export const Route = createFileRoute("/auth/signup")({
  component: AuthSignUpRoute,
});

function AuthSignUpRoute() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-8">
      <Card className="mx-auto h-auto w-full max-w-md lg:max-w-lg lg:p-6">
        <CardHeader className="flex flex-col items-center justify-center gap-2">
          <div className="mx-auto mt-4 flex flex-row items-center gap-2">
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
              <AvatarFallback>
                {SiteConfig.title.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Typography variant="large">{SiteConfig.title}</Typography>
          </div>

          <CardDescription className="text-center">
            Create your account to start generating thumbnails.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <SignUpCredentialsForm />

          <Typography variant="muted" className="text-xs">
            Already have an account?{" "}
            <Typography variant="link" as={Link} href="/auth/signin">
              Sign in
            </Typography>
          </Typography>
        </CardContent>
      </Card>
    </main>
  );
}
