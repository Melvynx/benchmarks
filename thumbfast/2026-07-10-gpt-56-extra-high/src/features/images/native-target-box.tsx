import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type DragAndDropProps = {
  onDrop: (item: { files: File[] }) => Promise<void> | void;
  children?: React.ReactNode;
  className?: string;
  onDropClassName?: string;
  isLoading?: boolean;
  accept?: string[];
} & Omit<ComponentProps<"div">, "onDrop">;

/**
 * NativeTargetBox enable user to drag and drop files into the component.
 *
 * This component avoid you to install library only to handle drag and drop.
 *
 * @param accept - Ex: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
 * @param onDrop - The function that will be called when a file is dropped.
 * @param className - The class name of the div that contain colors.
 * @param onDropClassName - The class name of the div that contain colors when the user drop a file.
 * @param children - The content that will be displayed when the user drops a file.
 * @param isLoading - If true, the component will display a loading state.
 * @param props - The rest of the props that will be passed to the div element.
 */
export const NativeTargetBox = ({
  onDrop,
  children,
  className,
  isLoading,
  accept,
  ref,
  ...props
}: DragAndDropProps) => {
  const [isDrop, setIsDrop] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isLoading) return;
    e.preventDefault();
    setIsDrop(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isLoading) return;
    e.preventDefault();
    setIsDrop(false);
  };

  const handleDrop = () => {
    if (isLoading) return;
    setIsDrop(false);

    setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;

      const files = Array.from(input.files ?? []);

      if (files.length === 0) {
        toast.error(`We only accept ${accept?.join(", ")}`);
        return;
      }

      void onDrop({ files });
    }, 100);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);

    if (files.length) {
      await onDrop({ files });
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        background: isDrop ? "hsl(var(--background) / 0.5)" : undefined,
        padding: "20px",
        borderRadius: "5px",
        textAlign: "center",
        cursor: "pointer",
      }}
      ref={ref}
      className={cn("relative", className, {
        [props.onDropClassName ?? ""]: isDrop,
      })}
    >
      {children}
      {isDrop ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Typography variant="muted">Drop here</Typography>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Typography variant="muted">Upload</Typography>
        </div>
      )}
      <input
        type="file"
        ref={inputRef}
        className="absolute inset-0 opacity-0"
        onChange={handleInputChange}
        accept={accept?.join(", ")}
        multiple
      />
    </div>
  );
};
