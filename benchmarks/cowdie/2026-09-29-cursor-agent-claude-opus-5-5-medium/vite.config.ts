import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 9366, strictPort: true },
  preview: { port: 9366, strictPort: true },
  build: { chunkSizeWarningLimit: 1200 },
});
