/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5b4bff',
          dark: '#4338ca',
        },
        sidebar: '#111827',
        ink: '#0f172a',
        muted: '#64748b',
      },
    },
  },
  plugins: [],
}
