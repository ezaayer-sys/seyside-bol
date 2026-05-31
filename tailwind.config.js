/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        speyside: {
          dark: '#2d5016',
          mid: '#4a7c2f',
          light: '#6aab3f',
          tan: '#c4a35a',
          'tan-light': '#e8d5a3',
          cream: '#f5efe0',
          'brown-dark': '#6b3a2a',
          'brown-mid': '#8b5e3c',
        }
      }
    },
  },
  plugins: [],
}
