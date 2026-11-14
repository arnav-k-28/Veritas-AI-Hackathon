/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        banana: {
          50: '#FEFCE8',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
        },
        espresso: {
          950: '#18120E',
          900: '#221A14',
          800: '#2D221A',
          700: '#3E3025',
          600: '#5C4735',
          500: '#7B624C',
          400: '#B8A693',
        },
        cream: {
          50: '#FDFBF3',
          100: '#F6EFE0',
          200: '#EDE3CC',
          300: '#DDD0B6',
          400: '#C4B393',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
