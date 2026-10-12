import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  server: { port: 9185, strictPort: true },
  preview: { port: 9185, strictPort: true },
});
