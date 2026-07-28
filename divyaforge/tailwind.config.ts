import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // warm "temple ivory" neutrals + saffron accent
        ivory: {
          50: "#FDFBF7",
          100: "#F8F3EA",
          200: "#EFE6D6",
          300: "#E2D3BA",
        },
        saffron: {
          50: "#FFF8ED",
          100: "#FFEFD4",
          400: "#F59E2D",
          500: "#E8891A",
          600: "#C96E0F",
          700: "#A3550C",
        },
        maroon: {
          700: "#7C2D2D",
          800: "#5F1F1F",
          900: "#471616",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "Noto Sans Devanagari",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
