import ThumbnailApp from "@/components/thumbnail-app";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 bg-grid opacity-35" />
      <div className="absolute inset-0 bg-glow opacity-40" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-12">
        <div className="backdrop-panel rounded-[32px] p-8 md:p-10">
          <ThumbnailApp />
        </div>
        <footer className="text-xs text-soft">
          Gemini image generation • Built for YouTube creators
        </footer>
      </main>
    </div>
  );
}
