import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        rose: {
          50: "#fdf5f6",
          100: "#fbe9ec",
          200: "#f6d3d9",
          300: "#eeafba",
          400: "#e28496",
          500: "#d25c75",
          600: "#bc3f5d",
          700: "#9d304c",
          800: "#842b44",
          900: "#71283f",
          950: "#3e111f",
        },
        gold: {
          50: "#fbf8f1",
          100: "#f5eede",
          200: "#eadbbc",
          300: "#dcc292",
          400: "#cda368",
          500: "#c28d4c",
          600: "#b47940",
          700: "#966037",
          800: "#794e32",
          900: "#63412b",
        },
        cream: {
          50: "#fdfcf9",
          100: "#faf6ee",
          200: "#f3ead9",
          300: "#e9dabe",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        "3xl": "1.75rem",
        "4xl": "2.5rem",
      },
      boxShadow: {
        luxe: "0 8px 40px -12px rgba(190, 90, 120, 0.25)",
        "luxe-lg": "0 24px 80px -20px rgba(190, 90, 120, 0.35)",
        glass: "0 8px 32px rgba(31, 20, 24, 0.12)",
      },
      backgroundImage: {
        "rose-radial":
          "radial-gradient(ellipse at top, hsl(var(--glow) / 0.25), transparent 60%)",
        "gold-shimmer":
          "linear-gradient(110deg, #dcc292 0%, #f5eede 45%, #dcc292 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "10%": { transform: "scale(1.12)" },
          "20%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.08)" },
          "40%": { transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 3s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        heartbeat: "heartbeat 2.2s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
