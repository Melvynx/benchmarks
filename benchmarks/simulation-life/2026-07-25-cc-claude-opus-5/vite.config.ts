import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 9217, strictPort: true },
  preview: { port: 9217, strictPort: true },
  // Several tests simulate 30-50 world-minutes headless, which takes seconds.
  test: { testTimeout: 60000 },
})
