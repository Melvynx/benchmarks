/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        garden: {
          bg: '#0c121e',
          dish: '#2a3b32',
          soil: '#5a4634',
          grass: '#3b7a57',
          blue: '#3b82f6',
          red: '#ef4444',
          fruit: '#10b981',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['"Figtree"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Bricolage Grotesque"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
