"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { X, Download, Upload } from "lucide-react";

type ImageFile = {
  preview: string;
  base64: string;
};

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<ImageFile[]>([]);
  const [inspiration, setInspiration] = useState<ImageFile | null>(null);
  const [persons, setPersons] = useState<ImageFile[]>([]);
  const [count, setCount] = useState<string>("1");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const createImageFile = async (file: File): Promise<ImageFile> => {
    const base64 = await fileToBase64(file);
    return {
      preview: URL.createObjectURL(file),
      base64,
    };
  };

  const extraImagesDropzone = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop: async (acceptedFiles) => {
      const imageFiles = await Promise.all(
        acceptedFiles.map((file) => createImageFile(file))
      );
      setExtraImages((prev) => [...prev, ...imageFiles]);
    },
  });

  const inspirationDropzone = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const imageFile = await createImageFile(acceptedFiles[0]);
        setInspiration(imageFile);
      }
    },
  });

  const personsDropzone = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop: async (acceptedFiles) => {
      const imageFiles = await Promise.all(
        acceptedFiles.map((file) => createImageFile(file))
      );
      setPersons((prev) => [...prev, ...imageFiles]);
    },
  });

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removePerson = (index: number) => {
    setPersons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setGeneratedImages([]);

    try {
      const allImages = [
        ...extraImages.map((img) => img.base64),
        ...(inspiration ? [inspiration.base64] : []),
        ...persons.map((img) => img.base64),
      ];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: allImages,
          count: parseInt(count),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate thumbnails");
      }

      setGeneratedImages(data.images);
      toast.success("Thumbnails generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate thumbnails"
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
  };

  const DropzoneCard = ({
    getRootProps,
    getInputProps,
    isDragActive,
    label,
    images,
    onRemove,
    single = false,
  }: {
    getRootProps: () => any;
    getInputProps: () => any;
    isDragActive: boolean;
    label: string;
    images: ImageFile[];
    onRemove?: (index: number) => void;
    single?: boolean;
  }) => (
    <div className="flex-1">
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <Card
        {...getRootProps()}
        className={`cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-border"
        }`}
      >
        <CardContent className="p-4 min-h-[120px] flex flex-col items-center justify-center">
          <input {...getInputProps()} />
          {images.length === 0 ? (
            <>
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {isDragActive ? "Drop here" : "Drag & drop or click"}
              </p>
            </>
          ) : (
            <div className="w-full grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Upload ${index}`}
                    className="w-full h-20 object-cover rounded"
                  />
                  {onRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">YouTube Thumbnail Generator</h1>
          <p className="text-muted-foreground">
            Generate stunning thumbnails with AI
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium mb-2 block">
              Prompt
            </Label>
            <Input
              id="prompt"
              placeholder="Describe your ideal YouTube thumbnail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="text-lg h-20"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <DropzoneCard
              {...extraImagesDropzone}
              label="Extra Images"
              images={extraImages}
              onRemove={removeExtraImage}
            />
            <DropzoneCard
              {...inspirationDropzone}
              label="Inspiration"
              images={inspiration ? [inspiration] : []}
              onRemove={() => setInspiration(null)}
              single
            />
            <DropzoneCard
              {...personsDropzone}
              label="Persons"
              images={persons}
              onRemove={removePerson}
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="count" className="text-sm font-medium mb-2 block">
                Count
              </Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger id="count">
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
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              {loading ? "Generating..." : "Generate Thumbnails"}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-4 mt-8">
            {Array.from({ length: parseInt(count) }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-video" />
            ))}
          </div>
        )}

        {!loading && generatedImages.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-8">
            {generatedImages.map((img, index) => (
              <Card key={index} className="overflow-hidden group">
                <CardContent className="p-0 relative">
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={`Generated ${index + 1}`}
                    className="w-full aspect-video object-cover"
                  />
                  <Button
                    onClick={() => downloadImage(img, index)}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
