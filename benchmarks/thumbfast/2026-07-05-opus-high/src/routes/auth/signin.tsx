import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SiteConfig } from "@/site-config";
import { createFileRoute } from "@tanstack/react-router";
import { SignInProviders } from "@public-site/auth/signin/sign-in-providers";
import Link from "@/compat/link";

export const Route = createFileRoute("/auth/signin")({
  component: AuthSignInRoute,
});

const socialProviders = ["github", "google"];
const authVisualImage = "/landing/auth-signin-visual.jpeg";

function AuthSignInRoute() {
  return (
    <main className="bg-background text-foreground grid min-h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
      <section className="bg-foreground relative hidden min-h-dvh overflow-hidden lg:block">
        <img
          src={authVisualImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.08), transparent 28%), linear-gradient(180deg, rgba(7, 9, 15, 0.34), rgba(7, 9, 15, 0.88))",
          }}
        />
        <div className="text-primary-foreground relative flex h-full min-h-dvh flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="border-primary-foreground/20 bg-background/10 shadow-foreground/20 flex size-11 items-center justify-center rounded-xl border shadow-lg backdrop-blur-md">
              <Avatar className="size-7 rounded-md">
                <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
                <AvatarFallback className="text-background bg-background text-sm font-semibold">
                  {SiteConfig.title.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </span>
            <span className="text-xl font-semibold">{SiteConfig.title}</span>
          </Link>

          <div className="max-w-xl space-y-5">
            <p className="text-4xl leading-[1.05] font-semibold text-balance xl:text-5xl">
              Your thumbnail workspace, ready when you are.
            </p>
            <p className="text-primary-foreground/78 max-w-md text-base leading-7">
              Sign in to keep your face profiles, inspirations, and generated
              thumbnails close.
            </p>
          </div>

          <p className="text-primary-foreground/62 max-w-sm text-sm leading-6">
            Secure access for creators building a recognizable YouTube channel.
          </p>
        </div>
      </section>

      <section className="bg-card flex min-h-dvh flex-col">
        <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10 lg:py-8">
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
              <AvatarFallback>
                {SiteConfig.title.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold">{SiteConfig.title}</span>
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground ml-auto text-sm font-medium transition-colors"
          >
            Back home
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 pt-4 pb-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="space-y-3">
              <p className="text-primary text-sm font-medium">Welcome back</p>
              <div className="space-y-2">
                <h1 className="text-foreground text-3xl leading-tight font-semibold text-balance">
                  Sign in to {SiteConfig.title}
                </h1>
                <p className="text-muted-foreground text-sm leading-6 text-pretty">
                  Use an email code or continue with a connected provider.
                </p>
              </div>
            </div>

            <SignInProviders providers={socialProviders} variant="split" />
          </div>
        </div>
      </section>
    </main>
  );
}
