"use client";

import { Youtube, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="w-full py-8 px-4">
      <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/20">
            <Youtube className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Thumbnail
            <span className="bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
        </div>
        <p className="text-muted-foreground max-w-lg text-base sm:text-lg">
          Generate stunning, high-converting YouTube thumbnails in seconds with
          AI
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
          <Sparkles className="w-4 h-4" />
          <span>Powered by Gemini 3 Pro</span>
        </div>
      </div>
    </header>
  );
}
