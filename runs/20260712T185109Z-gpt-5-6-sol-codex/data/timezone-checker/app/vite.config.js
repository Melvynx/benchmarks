import { defineConfig } from 'vite';

export default defineConfig({
  cacheDir: '.vite',
  server: {
    host: '0.0.0.0',
    port: 9111,
  },
});
