"use client";

import { useState, useCallback } from "react";
import { Sparkles, ImagePlus, User, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CountPicker } from "@/components/count-picker";
import { ImageDropzone, type UploadedImage } from "@/components/image-dropzone";
import {
  ThumbnailCard,
  ThumbnailSkeleton,
  type GeneratedThumbnail,
} from "@/components/thumbnail-card";
import { Lightbox } from "@/components/lightbox";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [extras, setExtras] = useState<UploadedImage[]>([]);
  const [inspiration, setInspiration] = useState<UploadedImage[]>([]);
  const [persons, setPersons] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [lightbox, setLightbox] = useState<GeneratedThumbnail | null>(null);

  const generate = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Please describe your thumbnail first");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          count,
          extras: extras.map((e) => ({ dataUrl: e.dataUrl })),
          inspiration: inspiration.map((e) => ({ dataUrl: e.dataUrl })),
          persons: persons.map((e) => ({ dataUrl: e.dataUrl })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Generation failed");
      }

      const newOnes: GeneratedThumbnail[] = (
        data.images as { data: string; mediaType: string }[]
      ).map((img) => ({
        id: crypto.randomUUID(),
        dataUrl: `data:${img.mediaType};base64,${img.data}`,
        prompt: trimmed,
      }));

      setThumbnails((prev) => [...newOnes, ...prev]);
      toast.success(
        `Generated ${newOnes.length} thumbnail${newOnes.length > 1 ? "s" : ""}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, count, extras, inspiration, persons]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isGenerating) generate();
    }
  };

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
        <header className="mb-10 sm:mb-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground mb-5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Powered by Gemini 3 Pro
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-3">
            Thumbnail Studio
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            Describe your YouTube thumbnail. Add references. Generate.
          </p>
        </header>

        <section className="mb-6">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="A dramatic split-screen of a person reacting to a glowing AI robot, bold title text, neon accents, cinematic lighting..."
              rows={3}
              className="min-h-[120px] text-base sm:text-lg pr-14"
            />
            <div className="absolute bottom-3 right-3 pointer-events-none opacity-60 text-[10px] font-mono text-muted-foreground bg-background/80 border border-border rounded px-1.5 py-0.5">
              ⌘ + ↵
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-5 rounded-2xl border border-border bg-card/30 p-5">
          <ImageDropzone
            label="Extra Images"
            hint="Objects or scene elements"
            icon={<ImagePlus />}
            multiple
            maxFiles={4}
            images={extras}
            onChange={setExtras}
            accentClass="text-sky-400"
          />
          <ImageDropzone
            label="Inspiration"
            hint="A style or composition reference"
            icon={<Sparkles />}
            multiple={false}
            maxFiles={1}
            images={inspiration}
            onChange={setInspiration}
            accentClass="text-violet-400"
          />
          <ImageDropzone
            label="Persons"
            hint="Face references to preserve"
            icon={<User />}
            multiple
            maxFiles={4}
            images={persons}
            onChange={setPersons}
            accentClass="text-orange-400"
          />
        </section>

        <section className="mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Generate</span>
            <CountPicker value={count} onChange={setCount} />
            <span className="text-sm text-muted-foreground hidden sm:inline">
              thumbnail{count > 1 ? "s" : ""}
            </span>
          </div>

          <Button
            variant="gradient"
            size="xl"
            onClick={generate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full sm:w-auto min-w-[200px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="size-4" />
                Generate
              </>
            )}
          </Button>
        </section>

        <section>
          {isGenerating && thumbnails.length === 0 && (
            <div
              className={
                "grid gap-4 " +
                (count === 1
                  ? "grid-cols-1 max-w-3xl mx-auto"
                  : "grid-cols-1 sm:grid-cols-2")
              }
            >
              {Array.from({ length: count }).map((_, i) => (
                <ThumbnailSkeleton key={i} index={i} />
              ))}
            </div>
          )}

          {isGenerating && thumbnails.length > 0 && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
              {Array.from({ length: count }).map((_, i) => (
                <ThumbnailSkeleton key={i} index={i} />
              ))}
            </div>
          )}

          {thumbnails.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Your thumbnails
                </h2>
                <span className="text-xs text-muted-foreground">
                  {thumbnails.length} generated
                </span>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {thumbnails.map((t, i) => (
                  <ThumbnailCard
                    key={t.id}
                    thumbnail={t}
                    index={i}
                    onOpen={setLightbox}
                  />
                ))}
              </div>
            </>
          )}

          {!isGenerating && thumbnails.length === 0 && (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-card/50 border border-border">
                <Sparkles className="size-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Your generated thumbnails will appear here.
              </p>
            </div>
          )}
        </section>
      </div>

      <Lightbox thumbnail={lightbox} onClose={() => setLightbox(null)} />

      <footer className="py-8 text-center text-xs text-muted-foreground/60">
        Generated with Gemini 3 Pro · 16:9 · Photorealistic
      </footer>
    </main>
  );
}
