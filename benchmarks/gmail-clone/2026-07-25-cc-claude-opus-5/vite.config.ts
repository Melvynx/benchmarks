import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 9216, strictPort: true, host: true },
  preview: { port: 9216, strictPort: true, host: true },
})
