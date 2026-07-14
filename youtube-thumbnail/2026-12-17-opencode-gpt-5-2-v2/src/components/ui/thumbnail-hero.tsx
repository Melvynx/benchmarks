import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function ThumbnailHero() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <Badge className="rounded-full border border-foreground/20 bg-background/70 text-xs uppercase tracking-[0.3em] text-soft">
          Gemini Image Lab
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          YouTube Thumbnail Generator
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-soft">
          Generate cinematic, photorealistic thumbnails with Gemini. Blend your
          prompt with reference and inspiration images for a Midjourney-style
          look.
        </p>
      </div>
      <ThemeToggle />
    </div>
  );
}
