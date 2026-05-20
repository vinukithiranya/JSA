/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f2f9ef",
          100: "#e1f2d9",
          200: "#c2e5b2",
          300: "#9fd78a",
          400: "#7fc96d",
          500: "#60b555",
          600: "#499241",
          700: "#377133",
          800: "#285229",
          900: "#1d3b1f",
        },
        sc: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },
      },
      boxShadow: {
        card: "0 16px 40px rgba(67, 94, 45, 0.12)",
      },
    },
  },
  plugins: [],
};
