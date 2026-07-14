import { ThemeToggle } from "@/components/theme-toggle";
import { ThumbnailGenerator } from "@/components/thumbnail-generator";

export default function Home() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-6rem] h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.12),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12),transparent_72%)]" />
        <div className="ambient-grid absolute inset-0 opacity-60" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              Gemini 3 Pro Image Preview
            </p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                YouTube thumbnail generation, built for iteration.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Prompt once, mix in references, and generate up to four
                thumbnail concepts in a single run.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <ThumbnailGenerator />
      </main>
    </div>
  );
}
