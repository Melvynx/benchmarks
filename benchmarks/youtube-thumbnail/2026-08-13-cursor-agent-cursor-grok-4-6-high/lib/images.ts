export type ReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
};

export type GeneratedImage = {
  data: string;
  mediaType: string;
};

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function toPreviewSrc(image: GeneratedImage): string {
  if (image.data.startsWith("data:")) {
    return image.data;
  }
  return `data:${image.mediaType};base64,${image.data}`;
}

export function downloadImage(image: GeneratedImage, filename: string) {
  const link = document.createElement("a");
  link.href = toPreviewSrc(image);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
