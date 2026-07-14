export interface LoadedImage {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export const loadImageFromFile = async (file: File): Promise<LoadedImage> => {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('File read error'));
    reader.readAsDataURL(file);
  });
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    img.onerror = () => reject(new Error('Image decode error'));
    img.src = src;
  });
};

export const loadImageFromUrl = async (url: string): Promise<LoadedImage> => {
  return new Promise<LoadedImage>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () =>
      resolve({ src: url, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    img.onerror = () => reject(new Error('Image load error'));
    img.src = url;
  });
};
