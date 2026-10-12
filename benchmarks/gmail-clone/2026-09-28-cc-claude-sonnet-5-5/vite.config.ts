/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 9232, strictPort: true, host: '127.0.0.1' },
  preview: { port: 9232, strictPort: true, host: '127.0.0.1' },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
