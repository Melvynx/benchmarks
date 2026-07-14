import { ThemeToggle } from "@/components/theme-toggle";
import { ThumbnailGenerator } from "@/components/thumbnail-generator";
import { Youtube } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-600 p-2">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Thumbnail Generator</h1>
              <p className="text-xs text-muted-foreground">
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Create Eye-Catching Thumbnails
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload your face, add inspiration, and let AI generate professional
            YouTube thumbnails that get clicks.
          </p>
        </div>
        <ThumbnailGenerator />
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Generate professional thumbnails with AI
        </div>
      </footer>
    </div>
  );
}
