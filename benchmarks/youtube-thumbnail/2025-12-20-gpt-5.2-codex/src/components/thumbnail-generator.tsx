"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Image as ImageIcon, 
  User, 
  Sparkles, 
  Download, 
  Loader2,
  X
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { generateThumbnailAction } from "@/app/actions";

export default function ThumbnailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState([1]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "face" | "inspiration" | "extra"
  ) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === "face") {
          setFaceImages(prev => [...prev, base64].slice(-3));
        } else if (type === "inspiration") {
          setInspirationImage(base64);
        } else if (type === "extra") {
          setExtraImages(prev => [...prev, base64].slice(-3));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number, type: "face" | "extra") => {
    if (type === "face") {
      setFaceImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setExtraImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Generating your thumbnails...");
    try {
      const result = await generateThumbnailAction({
        prompt,
        count: count[0],
        faceImages,
        inspirationImage,
        extraImages
      });

      if (result.success && result.images) {
        setGeneratedThumbnails(prev => [...result.images!, ...prev]);
        toast.success(`Generated ${result.images.length} thumbnails!`, { id: toastId });
      } else {
        toast.error(result.error || "Failed to generate thumbnails", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred", { id: toastId });
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `thumbnail-${Date.now()}-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearInputs = () => {
    setPrompt("");
    setFaceImages([]);
    setInspirationImage(null);
    setExtraImages([]);
    toast.info("Inputs cleared");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold tracking-tight">Gemini Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-zinc-500 hover:text-zinc-100"
              onClick={clearInputs}
            >
              Clear All
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Input Section */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Face Upload */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="w-4 h-4" />
                  <Label className="text-xs font-medium uppercase tracking-wider">Face Reference</Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {faceImages.map((img, i) => (
                    <div key={i} className="relative aspect-square group">
                      <Image src={img} alt="face" fill className="object-cover rounded-md" />
                      <button 
                        onClick={() => removeImage(i, "face")}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {faceImages.length < 3 && (
                    <label className="aspect-square rounded-md border border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, "face")} />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspiration */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ImageIcon className="w-4 h-4" />
                  <Label className="text-xs font-medium uppercase tracking-wider">Inspiration</Label>
                </div>
                {inspirationImage ? (
                  <div className="relative aspect-video group">
                    <Image src={inspirationImage} alt="inspiration" fill className="object-cover rounded-md" />
                    <button 
                      onClick={() => setInspirationImage(null)}
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-video rounded-md border border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "inspiration")} />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Extra Images */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <ImageIcon className="w-4 h-4" />
                  <Label className="text-xs font-medium uppercase tracking-wider">Extra Context</Label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {extraImages.map((img, i) => (
                    <div key={i} className="relative aspect-square group">
                      <Image src={img} alt="extra" fill className="object-cover rounded-md" />
                      <button 
                        onClick={() => removeImage(i, "extra")}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {extraImages.length < 3 && (
                    <label className="aspect-square rounded-md border border-dashed border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, "extra")} />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <CardContent className="p-5 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Count</Label>
                    <Badge variant="outline" className="text-zinc-500">{count[0]}</Badge>
                  </div>
                  <Slider 
                    value={count} 
                    onValueChange={setCount} 
                    max={4} 
                    min={1} 
                    step={1} 
                    className="py-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Output Format</Label>
                  <p className="text-sm text-zinc-500">16:9 Aspect Ratio</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative group">
            <Input
              placeholder="Describe your thumbnail... (e.g., 'A dramatic reaction face with neon text: I BUILT AN AI IN 24 HOURS')"
              className="h-16 bg-zinc-900 border-zinc-800 text-lg px-6 rounded-2xl focus-visible:ring-zinc-700 group-hover:border-zinc-700 transition-all shadow-2xl"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <Button 
              className="absolute right-2 top-2 bottom-2 bg-zinc-100 text-black hover:bg-zinc-300 rounded-xl px-6 transition-all font-semibold"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </section>

        <Separator className="bg-zinc-800/50" />

        {/* Output Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Generated Thumbnails</h2>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-zinc-900 text-zinc-400 border-zinc-800">
                {generatedThumbnails.length} Results
              </Badge>
            </div>
          </div>

          {generatedThumbnails.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generatedThumbnails.map((thumb, i) => (
                <div key={i} className="group relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                  <div className="aspect-video relative">
                    <Image src={thumb} alt={`Generated thumbnail ${i + 1}`} fill className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button 
                      variant="outline" 
                      className="bg-white text-black border-none hover:bg-zinc-200"
                      onClick={() => handleDownload(thumb, i)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-video w-full rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center space-y-4 bg-zinc-900/20">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-zinc-700" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-zinc-500 font-medium">No thumbnails generated yet</p>
                <p className="text-zinc-600 text-sm">Fill in the details and hit generate to start</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

