/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#1e1e1e',
          bgRaised: '#2c2c2c',
          border: '#2b2b2b',
          divider: '#383838',
        },
        text: {
          primary: '#ffffff',
          secondary: '#b3b3b3',
          tertiary: '#757575',
          disabled: '#444444',
        },
        accent: {
          DEFAULT: '#0d99ff',
          hover: '#3aaeff',
          subtle: '#0d99ff22',
        },
        surface: {
          canvas: '#1e1e1e',
          artboard: '#e5e5e5',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        xxs: ['10px', '12px'],
        xs: ['11px', '16px'],
        sm: ['12px', '16px'],
      },
    },
  },
  plugins: [],
};
