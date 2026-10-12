import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 9369, strictPort: true },
  preview: { host: '127.0.0.1', port: 9369, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
