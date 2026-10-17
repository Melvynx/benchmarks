import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9380,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 9380,
    host: true,
    strictPort: true,
  },
});
