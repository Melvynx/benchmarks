import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: { port: 9134, host: '0.0.0.0' },
    preview: { port: 9134, host: '0.0.0.0' },
});
