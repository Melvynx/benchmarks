import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 9224, strictPort: true },
  preview: { port: 9224, strictPort: true },
  test: { environment: 'node' },
})
