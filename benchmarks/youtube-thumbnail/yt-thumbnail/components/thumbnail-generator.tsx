"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageUploadZone } from "@/components/image-upload-zone";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { fileToDataUrl } from "@/lib/file-to-data-url";
import { cn } from "@/lib/utils";

type PreviewItem = { file: File; url: string };

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export function ThumbnailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [extra, setExtra] = useState<PreviewItem[]>([]);
  const [inspiration, setInspiration] = useState<PreviewItem[]>([]);
  const [persons, setPersons] = useState<PreviewItem[]>([]);
  const [count, setCount] = useState("1");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedImage[]>([]);

  const collectDataUrls = useCallback(async () => {
    const ordered: PreviewItem[] = [
      ...extra,
      ...inspiration,
      ...persons,
    ];
    return Promise.all(ordered.map((i) => fileToDataUrl(i.file)));
  }, [extra, inspiration, persons]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setGenerated([]);
    const toastId = toast.loading("Generating thumbnails…");
    try {
      const images = await collectDataUrls();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images,
          count: Number.parseInt(count, 10) || 1,
        }),
      });
      const payload = (await res.json()) as {
        images?: GeneratedImage[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error || `Request failed (${res.status})`);
      }
      const imgs = payload.images ?? [];
      if (imgs.length === 0) {
        toast.warning("No images returned. Try adjusting your prompt.", {
          id: toastId,
        });
      } else {
        setGenerated(imgs);
        toast.success(`Generated ${imgs.length} image(s)`, { id: toastId });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [collectDataUrls, count, prompt]);

  const downloadImage = useCallback((img: GeneratedImage, index: number) => {
    const href = `data:${img.mediaType};base64,${img.data}`;
    const a = document.createElement("a");
    a.href = href;
    a.download = `youtube-thumbnail-${index + 1}.${img.mediaType.includes("png") ? "png" : "jpg"}`;
    a.click();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-24 pt-10 md:px-6">
      <header className="flex flex-col gap-1 border-b border-border/40 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Thumbnail
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe the scene. Reference images are optional.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <Label htmlFor="prompt" className="text-xs text-muted-foreground">
          Prompt
        </Label>
        <Textarea
          id="prompt"
          placeholder="e.g. Developer at desk, neon accents, shocked expression, bold title space top-left…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={cn(
            "min-h-[120px] resize-y rounded-xl border-border/50 bg-muted/10 text-base md:text-sm",
            "placeholder:text-muted-foreground/50"
          )}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <ImageUploadZone
          label="Extra images"
          description="Style, props, or scene refs"
          multiple
          maxFiles={8}
          items={extra}
          onChange={setExtra}
        />
        <ImageUploadZone
          label="Inspiration"
          description="One reference look"
          multiple={false}
          items={inspiration}
          onChange={setInspiration}
        />
        <ImageUploadZone
          label="Persons"
          description="Faces or poses to match"
          multiple
          maxFiles={6}
          items={persons}
          onChange={setPersons}
        />
      </section>

      <div className="flex flex-col items-stretch gap-4 border-t border-border/40 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Count</Label>
          <Select
            value={count}
            onValueChange={(v) => {
              if (v) setCount(v);
            }}
            disabled={loading}
          >
            <SelectTrigger className="h-9 w-[120px] rounded-lg border-border/50 bg-muted/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          size="lg"
          className="h-10 rounded-lg px-8 font-medium"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating
            </>
          ) : (
            "Generate"
          )}
        </Button>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Output
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: Number.parseInt(count, 10) || 1 }).map(
              (_, i) => (
                <Skeleton
                  key={i}
                  className="aspect-video w-full rounded-xl bg-muted/30"
                />
              )
            )}
          </div>
        ) : generated.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {generated.map((img, i) => (
              <figure
                key={`${i}-${img.mediaType}`}
                className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL from API */}
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Generated thumbnail ${i + 1}`}
                  className="aspect-video w-full object-cover"
                />
                <figcaption className="flex items-center justify-between gap-2 border-t border-border/30 bg-background/80 px-3 py-2 backdrop-blur-sm">
                  <span className="text-[11px] text-muted-foreground">
                    #{i + 1}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => downloadImage(img, i)}
                  >
                    <Download className="size-3.5" />
                    Download
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/40 bg-muted/5">
            <p className="text-sm text-muted-foreground">
              Generated thumbnails appear here
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
