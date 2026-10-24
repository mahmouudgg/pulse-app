/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        surface: {
          50: '#141414',
          100: '#181818',
          200: '#222222',
          300: '#2c2c2c'
        },
        pulse: {
          white: '#FFFFFF',
          silver: '#E1E1E1',
          muted: '#8E8E93',
          dark: '#3A3A3C',
          border: '#262626'
        }
      },
      fontFamily: {
        sans: ['"Readex Pro"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Plus Jakarta Sans"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-bar': 'wave 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        wave: {
          '0%': { height: '20%' },
          '100%': { height: '95%' },
        }
      }
    },
  },
  plugins: [],
}
