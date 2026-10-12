import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9341,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 9341,
    strictPort: true,
    host: '127.0.0.1',
  },
  test: {
    environment: 'node',
    testTimeout: 120000,
  },
})
