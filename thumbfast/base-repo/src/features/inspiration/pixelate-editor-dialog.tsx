import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BorderedDialogBody,
  BorderedDialogContent,
  BorderedDialogFooter,
  BorderedDialogHeader,
  DialogEscClose,
} from "@/components/bordered-dialog";

type Region = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PixelateEditorDialogProps = {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pixelatedImageDataUrl: string) => Promise<void>;
};

export function PixelateEditorDialog({
  imageUrl,
  open,
  onOpenChange,
  onSave,
}: PixelateEditorDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [pixelSize, setPixelSize] = useState(15);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load image when dialog opens
  useEffect(() => {
    if (!open || !imageUrl) {
      setImage(null);
      setRegions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadImage = async () => {
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error("Failed to load image");
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const img = new window.Image();
        img.onload = () => {
          setImage(img);
          setIsLoading(false);
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
          setError("Failed to load image");
          setIsLoading(false);
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      } catch {
        setError("Failed to load image");
        setIsLoading(false);
      }
    };

    void loadImage();
  }, [imageUrl, open]);

  // Draw image and regions when image loads or regions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const maxWidth = 800;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    // Draw original image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Apply pixelation to all regions
    for (const region of regions) {
      applyPixelationToRegion(ctx, region, pixelSize);
    }
  }, [image, regions, pixelSize]);

  const applyPixelationToRegion = (
    ctx: CanvasRenderingContext2D,
    region: Region,
    blockSize: number,
  ) => {
    const absWidth = Math.floor(Math.abs(region.width));
    const absHeight = Math.floor(Math.abs(region.height));
    const startX = Math.floor(
      region.width < 0 ? region.x + region.width : region.x,
    );
    const startY = Math.floor(
      region.height < 0 ? region.y + region.height : region.y,
    );

    if (absWidth < 5 || absHeight < 5) return;

    // Clamp to canvas bounds
    const canvas = ctx.canvas;
    const clampedX = Math.max(0, startX);
    const clampedY = Math.max(0, startY);
    const clampedWidth = Math.min(absWidth, canvas.width - clampedX);
    const clampedHeight = Math.min(absHeight, canvas.height - clampedY);

    if (clampedWidth <= 0 || clampedHeight <= 0) return;

    const imageData = ctx.getImageData(
      clampedX,
      clampedY,
      clampedWidth,
      clampedHeight,
    );
    const data = imageData.data;

    for (let i = 0; i < clampedHeight; i += blockSize) {
      for (let j = 0; j < clampedWidth; j += blockSize) {
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let dy = 0; dy < blockSize && i + dy < clampedHeight; dy++) {
          for (let dx = 0; dx < blockSize && j + dx < clampedWidth; dx++) {
            const idx = ((i + dy) * clampedWidth + (j + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        for (let dy = 0; dy < blockSize && i + dy < clampedHeight; dy++) {
          for (let dx = 0; dx < blockSize && j + dx < clampedWidth; dx++) {
            const idx = ((i + dy) * clampedWidth + (j + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, clampedX, clampedY);
  };

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return;
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    currentRegionRef.current = {
      id: crypto.randomUUID(),
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentRegionRef.current || !image) return;

    const coords = getCanvasCoordinates(e);
    currentRegionRef.current = {
      ...currentRegionRef.current,
      width: coords.x - currentRegionRef.current.x,
      height: coords.y - currentRegionRef.current.y,
    };

    // Redraw canvas with current region preview
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Redraw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Apply existing regions
    for (const region of regions) {
      applyPixelationToRegion(ctx, region, pixelSize);
    }

    // Draw selection rectangle
    const r = currentRegionRef.current;
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(r.x, r.y, r.width, r.height);
    ctx.setLineDash([]);
  };

  const handleMouseUp = () => {
    const r = currentRegionRef.current;
    if (r && Math.abs(r.width) > 10 && Math.abs(r.height) > 10) {
      setRegions((prev) => [...prev, r]);
    }
    setIsDrawing(false);
    currentRegionRef.current = null;
  };

  const handleRemoveRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleReset = () => {
    setRegions([]);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      await onSave(dataUrl);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent maxWidth="sm:max-w-4xl">
        <BorderedDialogHeader
          title="Pixelate Image Regions"
          description="Draw rectangles on areas you want to pixelate (faces, text). The AI will replace pixelated faces with your selected persons."
        />

        <BorderedDialogBody>
          <div className="flex items-center gap-4">
            <Label className="shrink-0">Pixel Size:</Label>
            <Slider
              value={[pixelSize]}
              onValueChange={(v: number[]) => setPixelSize(v[0])}
              min={5}
              max={50}
              step={1}
              className="w-48"
            />
            <span className="text-muted-foreground w-12 text-sm">
              {pixelSize}px
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={regions.length === 0}
            >
              <RotateCcw className="mr-1 size-4" />
              Reset
            </Button>
          </div>

          <div className="bg-muted/30 relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-lg border p-2">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-inherit">
                <Loader2 className="size-8 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  Loading image...
                </span>
              </div>
            )}

            {error && (
              <div className="text-destructive absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-inherit">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            )}

            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`max-h-[60vh] max-w-full cursor-crosshair ${!image ? "invisible" : ""}`}
            />
          </div>

          {regions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-muted-foreground text-sm">
                {regions.length} region{regions.length > 1 ? "s" : ""}{" "}
                pixelated:
              </span>
              {regions.map((region, index) => (
                <Button
                  key={region.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveRegion(region.id)}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  Region {index + 1}
                  <Trash2 className="size-3" />
                </Button>
              ))}
            </div>
          )}
        </BorderedDialogBody>

        <BorderedDialogFooter>
          <DialogEscClose />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || regions.length === 0 || !image}
          >
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Apply Pixelation
          </Button>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
