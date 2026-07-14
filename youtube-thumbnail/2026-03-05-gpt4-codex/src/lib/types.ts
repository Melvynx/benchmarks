export type UploadedImage = {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
  mediaType: string;
};

export type GeneratedThumbnail = {
  id: string;
  dataUrl: string;
  mediaType: string;
};
