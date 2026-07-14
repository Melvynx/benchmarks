import { ThumbnailCard } from "@/components/ui/thumbnail-card";

type ThumbnailGridProps = {
  images: { data: string; mediaType: string }[];
  onDownload: (index: number) => void;
};

export function ThumbnailGrid({ images, onDownload }: ThumbnailGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {images.map((image, index) => (
        <ThumbnailCard
          key={`thumb-${index}`}
          src={`data:${image.mediaType};base64,${image.data}`}
          label={`Thumbnail ${index + 1}`}
          onDownload={() => onDownload(index)}
        />
      ))}
    </div>
  );
}
