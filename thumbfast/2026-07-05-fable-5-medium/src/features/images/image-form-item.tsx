import { Loader } from "@/components/nowts/loader";
import { cn } from "@/lib/utils";
import { useMutation } from "@/hooks/use-async-mutation";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { PropsWithChildren } from "react";
import Image from "@/compat/image";
import { toast } from "sonner";
import { NativeTargetBox } from "./native-target-box";
import { uploadImageFile } from "./upload-image";

const generateUploadUrlRef = makeFunctionReference<"mutation", {}, string>(
  "userImages:generateUploadUrl",
);

const completeImageUploadRef = makeFunctionReference<
  "mutation",
  { storageId: string },
  string
>("userImages:completeImageUpload");

type ImageFormItemProps = {
  onChange: (url: string) => void;
  imageUrl?: string | null;
  className?: string;
};

export const ImageFormItem = ({
  onChange,
  imageUrl,
  className,
}: ImageFormItemProps) => {
  const currentImage = imageUrl;

  return (
    <div
      className={cn(
        "bg-muted group relative aspect-square h-32 overflow-hidden rounded-md border",
        className,
      )}
    >
      <Image
        src={currentImage ?? "/images/placeholder.svg"}
        className="absolute inset-0 object-contain object-center"
        alt=""
        fill
      />
      <UseImageUpload onChange={onChange} />
    </div>
  );
};

const Overlay = (props: PropsWithChildren<{ isLoading?: boolean }>) => {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center opacity-0 transition-opacity",
        {
          "group-hover:bg-background/70 group-hover:opacity-100":
            !props.isLoading,
          "bg-background/70 opacity-100": props.isLoading,
        },
      )}
    >
      {props.children}
    </div>
  );
};

const UseImageUpload = ({ onChange }: { onChange: (url: string) => void }) => {
  const generateUploadUrl = useConvexMutation(
    generateUploadUrlRef,
  );
  const completeImageUpload = useConvexMutation(
    completeImageUploadRef,
  );
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const imageUrl = await uploadImageFile(file, {
        generateUploadUrl,
        completeImageUpload,
      });
      onChange(imageUrl);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    },
  });

  const handleDrop = async (item: { files: File[] }) => {
    const file = item.files[0] as File;

    const validFiles = ["image/png", "image/jpeg", "image/jpg"];

    if (!validFiles.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Only png, jpg, jpeg are allowed",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2MB)", {
        description: "https://tinypng.com/ to compress the image",
      });
      return;
    }

    uploadImageMutation.mutate(file);
  };

  return (
    <Overlay isLoading={uploadImageMutation.isPending}>
      <NativeTargetBox
        className="absolute inset-0 flex h-auto items-center justify-center"
        isLoading={uploadImageMutation.isPending}
        onDrop={handleDrop}
        accept={["*.png"]}
      >
        {uploadImageMutation.isPending ? <Loader /> : <></>}
      </NativeTargetBox>
    </Overlay>
  );
};
