import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 9310, strictPort: true, host: '127.0.0.1' },
  preview: { port: 9310, strictPort: true, host: '127.0.0.1' },
  test: { testTimeout: 60000 },
})
