/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#fff0f7', 100: '#ffe3f1', 400: '#ff7bbd', 500: '#ff4fa3', 600: '#e33a8c', 700: '#b92a70' },
        ink: { 900: '#1b1530', 800: '#2a2147', 700: '#3b2f63' },
      },
      boxShadow: { soft: '0 10px 30px -12px rgba(60, 20, 120, 0.25)' },
    },
  },
  plugins: [],
};
