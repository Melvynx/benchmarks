import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Image from "@/compat/image";
import { useParams } from "@/compat/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createInspirationRef,
  uploadInspirationImageRef,
} from "./inspiration.convex";

import { useAction as useConvexAction } from "convex/react";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";

const MAX_BULK_IMAGES = 100;
const UPLOAD_CONCURRENCY = 5;
const CREDIT_COST_PER_INSPIRATION = 0.1;

type BulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Phase = "select" | "processing" | "done";

type ImportResult = {
  fileName: string;
  success: boolean;
  error?: string;
};

async function uploadInChunks(
  files: File[],
  concurrency: number,
  uploadFile: (file: File) => Promise<string>,
  onProgress: (completed: number) => void,
): Promise<Map<File, string>> {
  const urlMap = new Map<File, string>();
  const chunks: File[][] = [];
  for (let i = 0; i < files.length; i += concurrency) {
    chunks.push(files.slice(i, i + concurrency));
  }

  let completed = 0;
  await chunks.reduce(async (prev, chunk) => {
    await prev;
    const results = await Promise.allSettled(
      chunk.map(async (file) => {
        const url = await uploadFile(file);
        return { file, url };
      }),
    );

    for (const result of results) {
      completed++;
      if (result.status === "fulfilled") {
        urlMap.set(result.value.file, result.value.url);
      }
    }
    onProgress(completed);
  }, Promise.resolve());

  return urlMap;
}

export function BulkImportDialog({
  open,
  onOpenChange,
}: BulkImportDialogProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const createInspiration = useConvexAction(createInspirationRef);
  const uploadInspirationImage = useConvexAction(uploadInspirationImageRef);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("select");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [createProgress, setCreateProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCredits = files.length * CREDIT_COST_PER_INSPIRATION;
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  const resetState = useCallback(() => {
    setFiles([]);
    setPhase("select");
    setUploadProgress(0);
    setCreateProgress(0);
    setResults([]);
    setIsProcessing(false);
  }, []);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    const imageFiles = selectedFiles.filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.type === "image/svg+xml" || f.type === "image/gif") return false;
      if (f.size > 2 * 1024 * 1024) return false;
      return true;
    });

    const limited = imageFiles.slice(0, MAX_BULK_IMAGES);
    setFiles(limited);

    e.target.value = "";
  };

  const handleImport = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setPhase("processing");

    const importResults: ImportResult[] = [];

    // Phase 1: Upload all files to S3
    const urlMap = await uploadInChunks(
      files,
      UPLOAD_CONCURRENCY,
      async (file) =>
        uploadInspirationImage({
          orgSlug,
          bytes: await file.arrayBuffer(),
          fileName: file.name,
          contentType: file.type,
        }),
      (completed) => {
        setUploadProgress(completed);
      },
    );

    // Phase 2: Create inspirations one by one
    await files.reduce(async (prev, file, i) => {
      await prev;

      const url = urlMap.get(file);

      if (!url) {
        importResults.push({
          fileName: file.name,
          success: false,
          error: "Upload failed",
        });
        setCreateProgress(i + 1);
        setResults([...importResults]);
        return;
      }

      try {
        await createInspiration({
          orgSlug,
          type: "upload",
          imageUrls: [url],
        });

        importResults.push({ fileName: file.name, success: true });
      } catch (error) {
        importResults.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : "Creation failed",
        });
      }

      setCreateProgress(i + 1);
      setResults([...importResults]);
    }, Promise.resolve());

    setPhase("done");
    setIsProcessing(false);

    const succeeded = importResults.filter((r) => r.success).length;
    if (succeeded > 0) {
      toast.success(
        `${succeeded} inspiration${succeeded > 1 ? "s" : ""} imported`,
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isProcessing) return;
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const progressPercent =
    phase === "processing"
      ? files.length > 0
        ? Math.round(
            ((uploadProgress + createProgress) / (files.length * 2)) * 100,
          )
        : 0
      : phase === "done"
        ? 100
        : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BorderedDialogContent>
        <BorderedDialogHeader
          title="Bulk Import"
          description={
            phase === "select" && files.length === 0
              ? `Select up to ${MAX_BULK_IMAGES} images to import as inspirations`
              : undefined
          }
        />

        <BorderedDialogBody>
          {phase === "select" && (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFilesSelected}
                className="sr-only"
              />

              {files.length === 0 ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="border-input hover:bg-accent/50 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed p-6 transition-colors"
                >
                  <div className="bg-background mb-3 flex size-11 items-center justify-center rounded-full border">
                    <ImageIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1 text-sm font-medium">
                    Select images to import
                  </p>
                  <p className="text-muted-foreground text-xs">
                    PNG, JPEG, WebP up to 2MB each (max {MAX_BULK_IMAGES})
                  </p>
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {files.length} image{files.length > 1 ? "s" : ""} selected
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                      className="text-muted-foreground h-auto p-0 text-xs"
                    >
                      Change selection
                    </Button>
                  </div>
                  <div className="no-scrollbar grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                    {files.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="relative aspect-video overflow-hidden rounded-lg border bg-neutral-100 dark:bg-neutral-800"
                      >
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "processing" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="size-5 shrink-0 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {createProgress === 0
                      ? `Uploading images... (${uploadProgress}/${files.length})`
                      : `Creating inspirations... (${createProgress}/${files.length})`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {createProgress === 0
                      ? "Uploading files to storage"
                      : "AI is analyzing each image"}
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {results.length > 0 && (
                <div className="no-scrollbar flex max-h-32 flex-col gap-1 overflow-y-auto">
                  {results
                    .slice()
                    .reverse()
                    .map((result, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {result.success ? (
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="text-destructive size-3.5 shrink-0" />
                        )}
                        <span className="truncate">{result.fileName}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-4">
              {failCount === 0 ? (
                <CheckCircle2 className="size-10 text-emerald-500" />
              ) : successCount === 0 ? (
                <XCircle className="text-destructive size-10" />
              ) : (
                <AlertCircle className="size-10 text-amber-500" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {failCount === 0
                    ? `All ${successCount} inspirations imported`
                    : successCount === 0
                      ? "Import failed"
                      : `${successCount} imported, ${failCount} failed`}
                </p>
                {failCount > 0 && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {failCount} image{failCount > 1 ? "s" : ""} could not be
                    imported
                  </p>
                )}
              </div>
              {failCount > 0 && (
                <div className="no-scrollbar mt-2 flex max-h-32 w-full flex-col gap-1 overflow-y-auto rounded-lg border p-3">
                  {results
                    .filter((r) => !r.success)
                    .map((result, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <XCircle className="text-destructive size-3.5 shrink-0" />
                        <span className="truncate">{result.fileName}</span>
                        {result.error && (
                          <span className="text-muted-foreground truncate">
                            - {result.error}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </BorderedDialogBody>

        <BorderedDialogFooter>
          {phase === "processing" ? (
            <>
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Processing...</span>
              </div>
              <span className="tabular-nums">{progressPercent}%</span>
            </>
          ) : phase === "done" ? (
            <>
              <DialogEscClose />
              <Button size="sm" onClick={handleClose}>
                Close
              </Button>
            </>
          ) : (
            <>
              <DialogEscClose />
              <Button
                size="sm"
                onClick={handleImport}
                disabled={files.length === 0}
              >
                Import {files.length > 0 ? files.length : ""}{" "}
                {files.length > 0 && totalCredits > 0 && (
                  <>
                    ({totalCredits}
                    <ImageIcon className="size-3" />)
                  </>
                )}
              </Button>
            </>
          )}
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
