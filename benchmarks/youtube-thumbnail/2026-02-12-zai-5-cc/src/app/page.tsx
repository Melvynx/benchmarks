"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { X, Upload, ImageIcon, Download, Sparkles } from "lucide-react";
import Image from "next/image";

interface ImageFile {
  id: string;
  base64: string;
  preview: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<ImageFile[]>([]);
  const [inspiration, setInspiration] = useState<ImageFile | null>(null);
  const [persons, setPersons] = useState<ImageFile[]>([]);
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    { data: string; mediaType: string }[]
  >([]);

  const convertToBase64 = (file: File): Promise<ImageFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve({
          id: crypto.randomUUID(),
          base64,
          preview: URL.createObjectURL(file),
        });
      };
      reader.onerror = reject;
    });
  };

  const handleDrop = useCallback(
    (
      acceptedFiles: File[],
      setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>,
      multiple = true
    ) => {
      const files = multiple ? acceptedFiles : [acceptedFiles[0]];
      Promise.all(files.map(convertToBase64)).then((newImages) => {
        if (multiple) {
          setImages((prev) => [...prev, ...newImages]);
        } else {
          setImages(newImages);
        }
      });
    },
    []
  );

  const handleSingleDrop = useCallback(
    (acceptedFiles: File[], setImage: React.Dispatch<React.SetStateAction<ImageFile | null>>) => {
      convertToBase64(acceptedFiles[0]).then(setImage);
    },
    []
  );

  const createDropzone = (
    onDrop: (files: File[]) => void,
    multiple = true
  ) => {
    return useDropzone({
      onDrop,
      accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
      multiple,
    });
  };

  const extraDropzone = createDropzone(
    (files) => handleDrop(files, setExtraImages, true),
    true
  );
  const inspirationDropzone = createDropzone(
    (files) => handleSingleDrop(files, setInspiration),
    false
  );
  const personsDropzone = createDropzone(
    (files) => handleDrop(files, setPersons, true),
    true
  );

  const removeImage = (
    id: string,
    setImages: React.Dispatch<React.SetStateAction<ImageFile[]>>
  ) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const allImages = [
        ...extraImages.map((img) => img.base64),
        ...(inspiration ? [inspiration.base64] : []),
        ...persons.map((img) => img.base64),
      ];

      const results = [];
      for (let i = 0; i < count; i++) {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, images: allImages }),
        });

        if (!response.ok) throw new Error("Generation failed");

        const data = await response.json();
        results.push(...data.images);
      }

      setGeneratedImages(results);
      toast.success("Thumbnails generated!");
    } catch (error) {
      toast.error("Failed to generate thumbnails");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (base64: string, mediaType: string) => {
    const link = document.createElement("a");
    link.href = `data:${mediaType};base64,${base64}`;
    link.download = `thumbnail-${Date.now()}.png`;
    link.click();
  };

  const DropzoneCard = ({
    title,
    dropzone,
    images,
    onRemove,
    single = false,
  }: {
    title: string;
    dropzone: ReturnType<typeof useDropzone>;
    images: ImageFile[];
    onRemove: (id: string) => void;
    single?: boolean;
  }) => (
    <Card className="border-dashed border-2 bg-transparent">
      <CardContent className="p-4">
        <Label className="text-sm font-medium mb-2 block">{title}</Label>
        <div
          {...dropzone.getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed transition-colors ${
            dropzone.isDragActive
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          } ${single ? "aspect-video" : "min-h-[120px]"}`}
        >
          <input {...dropzone.getInputProps()} />
          {single && images[0] ? (
            <div className="relative w-full h-full">
              <Image
                src={images[0].preview}
                alt="Preview"
                fill
                className="object-cover rounded-lg"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(images[0].id);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : images.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-2">
              {images.map((img) => (
                <div key={img.id} className="relative w-16 h-16">
                  <Image
                    src={img.preview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-md"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(img.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed rounded-md text-muted-foreground">
                <Upload className="h-5 w-5" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
              <Upload className="h-8 w-8 mb-2" />
              <span className="text-sm">Drop image{!single && "s"} here</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Input
          placeholder="Describe your YouTube thumbnail..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-lg h-14 px-6 bg-muted/50 border-muted"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <DropzoneCard
          title="Extra Images"
          dropzone={extraDropzone}
          images={extraImages}
          onRemove={(id) => removeImage(id, setExtraImages)}
        />
        <DropzoneCard
          title="Inspiration"
          dropzone={inspirationDropzone}
          images={inspiration ? [inspiration] : []}
          onRemove={() => setInspiration(null)}
          single
        />
        <DropzoneCard
          title="Persons"
          dropzone={personsDropzone}
          images={persons}
          onRemove={(id) => removeImage(id, setPersons)}
        />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4 flex-1 max-w-xs">
          <Label className="text-sm whitespace-nowrap">Count: {count}</Label>
          <Slider
            value={[count]}
            onValueChange={([v]) => setCount(v)}
            min={1}
            max={4}
            step={1}
            className="flex-1"
          />
        </div>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="px-8"
        >
          {isGenerating ? (
            <>
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-5 w-5" />
              Generate
            </>
          )}
        </Button>
      </div>

      {isGenerating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      )}

      {!isGenerating && generatedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {generatedImages.map((img, i) => (
            <Card key={i} className="overflow-hidden group">
              <div className="relative aspect-video">
                <Image
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Generated thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <Button
                  size="icon"
                  className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => downloadImage(img.data, img.mediaType)}
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
