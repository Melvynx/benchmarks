/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        ink: {
          950: '#08090d',
          900: '#0c0e14',
          850: '#11141c',
          800: '#171a24',
          750: '#1d2230',
          700: '#252b3c',
          600: '#38415a',
          500: '#5a6685',
          400: '#8590b0',
          300: '#aab3cc',
          200: '#cbd2e3',
          100: '#e6eaf2',
          50: '#f4f6fb',
        },
        accent: {
          500: '#7c5cff',
          400: '#9b85ff',
          600: '#6347f0',
        },
        leaf: {
          500: '#22c55e',
          400: '#4ade80',
          600: '#16a34a',
        },
        sun: {
          500: '#f59e0b',
          400: '#fbbf24',
        },
      },
      boxShadow: {
        'glow-leaf': '0 0 0 1px rgba(34, 197, 94, 0.35), 0 8px 24px -8px rgba(34, 197, 94, 0.4)',
      },
    },
  },
  plugins: [],
}