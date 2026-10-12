/// <reference types="vite/client" />

interface EyeDropper {
  open: () => Promise<{ sRGBHex: string }>;
}

interface Window {
  EyeDropper?: new () => EyeDropper;
}
