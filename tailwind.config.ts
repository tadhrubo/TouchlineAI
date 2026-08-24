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
        fpl: {
          green: "#00FF87",
          "green-dark": "#02894a",
          emerald: "#10b981",
          purple: "#37003c",
          pink: "#e90052",
          cyan: "#04f5ff",
          dark: "#0b0f17",
          card: "#121824",
          "card-hover": "#1a2233",
          border: "#1f293d",
          muted: "#64748b",
        },
      },
      backgroundImage: {
        "pitch-pattern": "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15), transparent 70%)",
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
