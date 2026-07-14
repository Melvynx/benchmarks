import { ThemeToggle } from "@/components/theme-toggle";
import { ThumbnailGenerator } from "@/components/thumbnail-generator";
import { Sparkles, Youtube, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid opacity-30 dark:opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-chart-2/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-lg rounded-lg" />
                  <div className="relative p-2 rounded-lg bg-gradient-to-br from-primary to-chart-2">
                    <Youtube className="w-5 h-5 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-tight">
                    Thumb<span className="text-primary">Forge</span>
          </h1>
                  <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
                    AI Thumbnail Generator
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium">Powered by Gemini</span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Hero Section */}
          <div className="text-center mb-10 lg:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                AI-Powered Thumbnail Creation
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Create Stunning Thumbnails
              <br />
              <span className="text-primary">In Seconds</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Upload your face, add inspiration from your favorite creators, and
              let AI generate scroll-stopping thumbnails that boost your CTR.
          </p>
        </div>

          {/* Generator */}
          <ThumbnailGenerator />

          {/* Features Section */}
          <div className="mt-16 lg:mt-24">
            <h3 className="text-center text-xl font-semibold mb-8">
              Why ThumbForge?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Sparkles className="w-5 h-5" />}
                title="AI-Powered"
                description="Leverages Google's Gemini for intelligent image generation that understands context and style."
              />
              <FeatureCard
                icon={<Youtube className="w-5 h-5" />}
                title="YouTube Optimized"
                description="Generates thumbnails in perfect 16:9 ratio, designed to maximize click-through rates."
              />
              <FeatureCard
                icon={<Zap className="w-5 h-5" />}
                title="Lightning Fast"
                description="Get professional-quality thumbnails in seconds, not hours. Perfect for busy creators."
              />
            </div>
        </div>
      </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 ThumbForge. Built with Next.js + Gemini AI.
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Made with</span>
                <span className="text-primary">♥</span>
                <span>for creators</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-primary/30 transition-all duration-300">
      <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
        <div className="text-primary">{icon}</div>
      </div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
