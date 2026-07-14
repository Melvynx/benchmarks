import { ThumbnailGenerator } from "@/components/thumbnail-generator";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative min-h-full flex-1 bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.35_0.08_264/0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.45_0.12_264/0.12),transparent)]" />
      <div className="pointer-events-auto fixed right-4 top-4 z-50 md:right-6 md:top-6">
        <ThemeToggle />
      </div>
      <ThumbnailGenerator />
    </div>
  );
}
