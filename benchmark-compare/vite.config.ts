import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    // TanStack Store imports this CommonJS compatibility entry as a named
    // export. Pre-bundle it so Vite exposes that export during hydration.
    include: ["use-sync-external-store/shim/with-selector"],
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})

export default config
