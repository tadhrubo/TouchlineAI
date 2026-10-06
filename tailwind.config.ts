import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ["var(--font-lemon-milk)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        tl: {
          bg: "#070908",
          surface: "#0D1110",
          surface2: "#111614",
          border: "#1E2421",
          borderSubtle: "#151B18",
          text: "#F1F3EF",
          muted: "#7F8983",
          green: "#16C784",
          warning: "#D6A83D",
          negative: "#E05252",
        },
        fpl: {
          green: "#16C784",
          "green-dark": "#02894a",
          emerald: "#10b981",
          purple: "#37003c",
          pink: "#e90052",
          cyan: "#04f5ff",
          dark: "#070908",
          card: "#0D1110",
          "card-hover": "#111614",
          border: "#1E2421",
          muted: "#7F8983",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      backgroundImage: {
        "pitch-pattern": "radial-gradient(ellipse at center, rgba(22, 199, 132, 0.08), transparent 70%)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
