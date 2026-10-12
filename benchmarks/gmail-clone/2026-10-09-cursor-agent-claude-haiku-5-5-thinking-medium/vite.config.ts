/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 9372, strictPort: true },
  preview: { host: '127.0.0.1', port: 9372, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
