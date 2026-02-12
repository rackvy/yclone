/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#1392ec",
        "background-light": "#f6f7f8",
        "background-dark": "#101a22",
        "confirmed": "#1392ec",
        "waiting": "#9333ea",
        "done": "#10b981",
        "category-hair": "#fef3c7",
        "category-nails": "#dcfce7",
        "category-spa": "#f3e8ff",
        "category-makeup": "#fee2e2",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
