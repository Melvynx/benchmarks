import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 9129, host: '0.0.0.0' },
  preview: { port: 9129, host: '0.0.0.0' },
})
