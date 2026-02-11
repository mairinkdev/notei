/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI Variable"',
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        app: "28px",
        card: "16px",
        control: "12px",
        chip: "8px",
      },
      boxShadow: {
        soft: "0 2px 12px rgba(0,0,0,0.06)",
        "soft-dark": "0 2px 12px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
