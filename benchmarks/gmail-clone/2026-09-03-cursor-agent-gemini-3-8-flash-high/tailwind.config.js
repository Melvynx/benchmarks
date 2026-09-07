/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          'blue-hover': '#1557b0',
          'blue-light': '#c2e7ff',
          'blue-tint': '#e8f0fe',
          red: '#ea4335',
          'red-hover': '#d93025',
          green: '#1e8e3e',
          'green-tint': '#e6f4ea',
          yellow: '#f9ab00',
          'yellow-tint': '#fef7e0',
          gray: {
            50: '#f8fafd',
            100: '#f2f6fc',
            200: '#e1e5ea',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#80868b',
            600: '#5f6368',
            700: '#3c4043',
            800: '#202124',
            900: '#171717',
          },
        },
      },
      fontFamily: {
        sans: [
          '"Google Sans"',
          'Roboto',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        compose: '0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12), 0 5px 5px -3px rgba(0,0,0,0.2)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 3px 0 rgba(0,0,0,0.08)',
        hover: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
        sheet: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
      },
    },
  },
  plugins: [],
};
