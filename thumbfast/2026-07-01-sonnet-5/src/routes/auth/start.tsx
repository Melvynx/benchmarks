import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layout } from "@/features/page/layout";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon, Palette, Sparkles, Target, Zap } from "lucide-react";
import { SignInProviders } from "@public-site/auth/signin/sign-in-providers";

export const Route = createFileRoute("/auth/start")({
  component: AuthStartRoute,
});

const socialProviders = ["github", "google"];

function AuthStartRoute() {
  return (
    <Layout
      className="m-0 flex min-h-full w-full flex-col items-center justify-center gap-8 px-4 py-8 xl:flex-row xl:items-start xl:gap-12 xl:px-8"
      size="lg"
    >
      <div className="flex w-full flex-col items-center gap-6 text-center xl:max-w-2xl xl:flex-1 xl:items-start xl:text-left 2xl:max-w-3xl">
        <Typography variant="h2" className="font-bold text-balance sm:text-4xl">
          The <span className="text-primary">Midjourney</span> of YouTube
          Thumbnails
        </Typography>
        <Typography variant="lead" className="text-muted-foreground">
          Create professional thumbnails in less than 4 minutes. Generate up to
          4 variations at once - your face stays consistent, every time.
        </Typography>
        <div className="text-muted-foreground flex flex-wrap justify-center gap-3 xl:justify-start">
          <Typography variant="small">No credit card required</Typography>
          <Typography variant="small">5 free thumbnails</Typography>
          <Typography variant="small">Cancel anytime</Typography>
        </div>
        <ul className="hidden flex-col gap-4 xl:flex">
          <li className="flex items-start gap-2">
            <Zap className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <Typography variant="large" className="font-medium">
                Lightning-fast generation
              </Typography>
              <Typography variant="muted">
                Create professional thumbnails in under 60 seconds, not hours in
                Photoshop.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <ImageIcon className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <Typography variant="large" className="font-medium">
                Consistent face technology
              </Typography>
              <Typography variant="muted">
                Your face looks the same across every thumbnail. Build
                recognizable channel branding.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Palette className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <Typography variant="large" className="font-medium">
                Style-matching inspirations
              </Typography>
              <Typography variant="muted">
                Save successful thumbnails as style references. Match proven
                viral aesthetics.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Sparkles className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <Typography variant="large" className="font-medium">
                4 variations per click
              </Typography>
              <Typography variant="muted">
                Generate multiple options at once. Pick the winner for A/B
                testing.
              </Typography>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <Target className="text-primary mt-0.5 size-5 shrink-0" />
            <div>
              <Typography variant="large" className="font-medium">
                YouTube-ready output
              </Typography>
              <Typography variant="muted">
                Perfect 1280x720 resolution. Upload directly to YouTube Studio.
              </Typography>
            </div>
          </li>
        </ul>
      </div>

      <Card className="w-full max-w-md shrink-0 xl:max-w-lg xl:p-8 2xl:max-w-xl">
        <CardHeader className="flex flex-col items-center justify-center gap-1 text-center">
          <Avatar className="mb-4 rounded-sm">
            <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
            <AvatarFallback>
              {SiteConfig.title.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <CardTitle>Start Creating Thumbnails Today</CardTitle>
          <CardDescription>
            Join creators who are saving hours and increasing their views with
            AI-powered thumbnails.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
          <SignInProviders callbackUrl="/orgs" providers={socialProviders} />
        </CardContent>
      </Card>
    </Layout>
  );
}
