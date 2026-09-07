import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 9314,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 9314,
    strictPort: true,
    host: true,
  },
})
