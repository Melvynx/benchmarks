import { defineConfig } from 'vite'

export default defineConfig({
  cacheDir: '.vite-cache',
  server: {
    host: '127.0.0.1',
    port: 9141,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 9141,
    strictPort: true,
  },
})
