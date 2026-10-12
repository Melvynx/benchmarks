import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9350,
    strictPort: true,
  },
  preview: {
    port: 9350,
    strictPort: true,
  },
});
