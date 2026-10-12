import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { port: 9333, host: "127.0.0.1" },
  preview: { port: 9333, host: "127.0.0.1" },
})
