/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolved from CSS variables so `.dark` on <html>
        // re-themes the entire app without touching component markup.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-soft': 'rgb(var(--c-line-soft) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        'fg-soft': 'rgb(var(--c-fg-soft) / <alpha-value>)',
        'fg-muted': 'rgb(var(--c-fg-muted) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--c-fg-subtle) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--c-accent-fg) / <alpha-value>)',
        sidebar: 'rgb(var(--c-sidebar) / <alpha-value>)',
        'on-sidebar': 'rgb(var(--c-on-sidebar) / <alpha-value>)',

        // Legacy aliases kept so existing `text-ink` / `text-muted` /
        // `bg-brand` markup themes automatically. Ivory + black accent.
        ink: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-fg-muted) / <alpha-value>)',
        brand: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          dark: 'rgb(var(--c-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--c-accent-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
}
