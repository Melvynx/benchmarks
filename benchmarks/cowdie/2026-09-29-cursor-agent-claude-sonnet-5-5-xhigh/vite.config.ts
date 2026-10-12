import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 9370, strictPort: true, host: '127.0.0.1' },
  preview: { port: 9370, strictPort: true, host: '127.0.0.1' },
  build: { chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
