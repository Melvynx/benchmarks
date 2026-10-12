import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 9378, strictPort: true },
  preview: { port: 9378, strictPort: true },
});
