import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PORT = 9374;

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  preview: { host: '127.0.0.1', port: PORT, strictPort: true },
});
