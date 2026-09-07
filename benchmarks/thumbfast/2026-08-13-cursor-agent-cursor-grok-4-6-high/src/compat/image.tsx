import type { CSSProperties, ImgHTMLAttributes } from "react";

type StaticImageDataLike = {
  src: string;
  width?: number;
  height?: number;
  blurDataURL?: string;
};

type NextImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "height" | "src" | "width"
> & {
  src: string | StaticImageDataLike;
  alt: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
  quality?: number | `${number}`;
  sizes?: string;
  placeholder?: "blur" | "empty" | `data:image/${string}`;
  blurDataURL?: string;
};

export default function Image({
  src,
  alt,
  fill,
  unoptimized: _unoptimized,
  priority,
  quality: _quality,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  style,
  ...props
}: NextImageProps) {
  const resolvedSrc = typeof src === "string" ? src : src.src;
  const imageStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }
    : (style as CSSProperties);

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      style={imageStyle}
      {...props}
    />
  );
}
