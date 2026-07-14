import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { makeFunctionReference } from "convex/server";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import {
  ArrowRight,
  Download,
  EyeOff,
  ImageIcon,
  Link2,
  Loader2,
  Upload,
  Youtube,
} from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { anonymizeToolRef } from "../anonymize.convex";

const STORAGE_KEY = "anonymize-tool-pending";

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
  /(?:youtu\.be\/)([\w-]{11})/,
  /(?:youtube\.com\/embed\/)([\w-]{11})/,
  /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  /(?:youtube\.com\/live\/)([\w-]{11})/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

type PendingData =
  | { type: "youtube"; youtubeUrl: string }
  | { type: "upload"; base64: string; fileName: string; mimeType: string };

type AnonymizeResult = {
  sourceImageUrl: string;
  anonymizedUrl: string;
};

const firstOrgRef = makeFunctionReference<
  "mutation",
  Record<string, never>,
  { redirectTo: string }
>("app:firstOrg");

function savePending(data: PendingData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

function loadPending(): PendingData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingData;
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToFile(
  base64: string,
  fileName: string,
  mimeType: string,
): File {
  const byteString = atob(base64.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], fileName, { type: mimeType });
}

const EXAMPLE_BEFORE =
  "https://codelynx.mlvcdn.com/images/2026-03-11/clipboard_image_1773248532.png";
const EXAMPLE_AFTER =
  "https://codelynx.mlvcdn.com/images/2026-03-11/clipboard_image_1773248543.png";

function ExampleSection() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="grid grid-cols-2">
          <div className="relative">
            <div className="bg-muted/80 absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              Before
            </div>
            <Image
              src={EXAMPLE_BEFORE}
              alt="Original YouTube thumbnail with people"
              width={640}
              height={360}
              className="h-auto w-full object-cover"
              unoptimized
            />
          </div>
          <div className="relative">
            <div className="bg-primary/90 text-primary-foreground absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase">
              After
            </div>
            <Image
              src={EXAMPLE_AFTER}
              alt="Anonymized thumbnail with wireframe mannequins"
              width={640}
              height={360}
              className="h-auto w-full object-cover"
              unoptimized
            />
          </div>
        </div>
        <div className="border-t px-4 py-2.5">
          <p className="text-muted-foreground text-center text-xs">
            AI replaces every person with a featureless grey mannequin while
            keeping everything else identical
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultSection({ result }: { result: AnonymizeResult }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(result.anonymizedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `anonymized-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Result</Badge>
        <p className="text-muted-foreground text-sm">
          People replaced with wireframe mannequins
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Original
          </p>
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <Image
              src={result.sourceImageUrl}
              alt="Original image"
              width={1280}
              height={720}
              className="h-auto w-full"
              unoptimized
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Anonymized
          </p>
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <Image
              src={result.anonymizedUrl}
              alt="Anonymized image"
              width={1280}
              height={720}
              className="h-auto w-full"
              unoptimized
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-8"
        >
          {isDownloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download Anonymized Image
        </Button>
      </div>
    </div>
  );
}

export function AnonymizeTool() {
  const { data: session } = useSession();
  const ensureFirstOrg = useConvexMutation(firstOrgRef);
  const anonymizeTool = useConvexAction(anonymizeToolRef);
  const [tab, setTab] = useState<"youtube" | "upload">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubePreviewId, setYoutubePreviewId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnonymizeResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasRestoredRef = useRef(false);

  const isSignedIn = Boolean(session?.user);

  // Restore pending data from localStorage after sign-in
  useEffect(() => {
    if (!isSignedIn || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const pending = loadPending();
    if (!pending) return;

    if (pending.type === "youtube") {
      setTab("youtube");
      setYoutubeUrl(pending.youtubeUrl);
      const id = extractVideoId(pending.youtubeUrl);
      if (id) setYoutubePreviewId(id);
    } else {
      setTab("upload");
      const file = base64ToFile(
        pending.base64,
        pending.fileName,
        pending.mimeType,
      );
      setSelectedFile(file);
      setPreviewUrl(pending.base64);
    }
    clearPending();

    // Auto-trigger anonymization after a short delay for state to settle
    setTimeout(() => {
      const btn = document.getElementById("anonymize-submit-btn");
      btn?.click();
    }, 300);
  }, [isSignedIn]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large (max 5MB)");
        return;
      }
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setShowSignIn(false);
    },
    [previewUrl],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleYoutubeUrlChange = (value: string) => {
    setYoutubeUrl(value);
    setResult(null);
    setShowSignIn(false);
    const id = extractVideoId(value);
    setYoutubePreviewId(id);
  };

  const handleAnonymize = async () => {
    // If not signed in, save to localStorage and show sign-in prompt
    if (!isSignedIn) {
      if (tab === "youtube" && youtubeUrl.trim()) {
        savePending({ type: "youtube", youtubeUrl: youtubeUrl.trim() });
      } else if (tab === "upload" && selectedFile) {
        try {
          const base64 = await fileToBase64(selectedFile);
          savePending({
            type: "upload",
            base64,
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
          });
        } catch {
          toast.error("Failed to save image data");
          return;
        }
      }
      setShowSignIn(true);
      return;
    }

    setIsLoading(true);
    setResult(null);
    setShowSignIn(false);

    try {
      const firstOrg = await ensureFirstOrg({});
      const orgSlug = firstOrg.redirectTo.split("/").filter(Boolean).at(1);
      if (!orgSlug) {
        throw new Error("Could not resolve workspace");
      }

      if (tab === "youtube") {
        if (!youtubeUrl.trim()) {
          toast.error("Please enter a YouTube URL");
          return;
        }
        const nextResult = await anonymizeTool({
          orgSlug,
          type: "youtube",
          youtubeUrl: youtubeUrl.trim(),
        });
        setResult(nextResult);
        toast.success("Image anonymized");
      } else {
        if (!selectedFile) {
          toast.error("Please select an image");
          return;
        }
        const nextResult = await anonymizeTool({
          orgSlug,
          type: "upload",
          bytes: await selectedFile.arrayBuffer(),
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        });
        setResult(nextResult);
        toast.success("Image anonymized");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const hasInput =
    (tab === "youtube" && youtubeUrl.trim()) ||
    (tab === "upload" && selectedFile);
  const canSubmit = !isLoading && hasInput;

  return (
    <div className="flex flex-col gap-10">
      {/* Example before/after */}
      {!result ? <ExampleSection /> : null}

      {/* Input section */}
      <div className="mx-auto w-full max-w-2xl">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as "youtube" | "upload");
            setResult(null);
            setShowSignIn(false);
          }}
        >
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="size-4" />
              YouTube URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="size-4" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <div className="bg-background flex items-center gap-0 rounded-2xl border p-2 shadow-lg shadow-black/5">
              <div className="text-muted-foreground flex items-center pl-3">
                <Link2 className="size-5" />
              </div>
              <input
                type="text"
                placeholder="Paste any YouTube URL..."
                value={youtubeUrl}
                onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) void handleAnonymize();
                }}
                className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent px-3 py-3 text-base outline-none sm:text-lg"
              />
              <Button
                id="anonymize-submit-btn"
                onClick={handleAnonymize}
                disabled={!canSubmit}
                size="lg"
                className="shrink-0 rounded-xl px-6 text-base font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {isLoading ? "Processing..." : "Anonymize"}
              </Button>
            </div>
            <p className="text-muted-foreground/60 mt-3 text-center text-sm">
              Supports youtube.com, youtu.be, embeds, Shorts, and live URLs
            </p>

            {/* YouTube thumbnail preview */}
            {youtubePreviewId && !result ? (
              <div className="mt-6">
                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Thumbnail preview
                </p>
                <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                  <Image
                    src={`https://i.ytimg.com/vi/${youtubePreviewId}/maxresdefault.jpg`}
                    alt="YouTube thumbnail preview"
                    width={1280}
                    height={720}
                    className="h-auto w-full"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="upload">
            <div
              className={cn(
                "bg-background flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-colors",
                isDragging && "border-primary bg-primary/5",
                selectedFile && "border-primary/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="flex w-full flex-col items-center gap-4">
                  <Image
                    src={previewUrl}
                    alt="Selected image preview"
                    width={640}
                    height={360}
                    className="max-h-64 w-auto rounded-lg object-contain"
                    unoptimized
                  />
                  <div className="flex items-center gap-3">
                    <p className="text-muted-foreground text-sm">
                      {selectedFile?.name}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (previewUrl.startsWith("blob:"))
                          URL.revokeObjectURL(previewUrl);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setResult(null);
                        setShowSignIn(false);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 flex size-14 items-center justify-center rounded-2xl">
                    <Upload className="text-muted-foreground size-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-medium">
                      Drag and drop an image here
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      or click to browse (max 5MB)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse files
                  </Button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {selectedFile ? (
              <div className="mt-4 flex justify-center">
                <Button
                  id="anonymize-submit-btn"
                  onClick={handleAnonymize}
                  disabled={!canSubmit}
                  size="lg"
                  className="px-8 text-base font-semibold"
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  {isLoading ? "Processing..." : "Anonymize Image"}
                </Button>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <div className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-xs">
          <Badge variant="outline" className="text-[10px]">
            1 thumbnail
          </Badge>
          per anonymization &middot; 5 free thumbnails on signup
        </div>
      </div>

      {/* Sign-in prompt - shown inline after user provides input */}
      {showSignIn && !isSignedIn ? (
        <div className="bg-card mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border p-8 text-center shadow-sm">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
            <EyeOff className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-foreground text-lg font-semibold">
              Create a free account to anonymize
            </p>
            <p className="text-muted-foreground text-sm">
              Sign up to get 5 free thumbnails. Your image is saved locally and
              will be anonymized automatically after sign-in.
            </p>
          </div>
          <Button asChild size="lg" className="mt-2 w-full">
            <Link href="/auth/signin">
              Sign up free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="text-muted-foreground/60 text-xs">
            No credit card required
          </p>
        </div>
      ) : null}

      {/* Result */}
      {result ? <ResultSection result={result} /> : null}
    </div>
  );
}
