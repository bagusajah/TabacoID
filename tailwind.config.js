/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4B3FE3",
          bright: "#5A4DFF",
          ink: "#111827",
          accent: "#5EEAD4",
          mint: "#A7F3D0",
          mist: "#C4B5FD",
          paper: "#F8FAFC",
        },
      },
    },
  },
  plugins: [],
};
