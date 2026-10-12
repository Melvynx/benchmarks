import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const PORT = 9237

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: PORT, strictPort: true },
  preview: { host: true, port: PORT, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
