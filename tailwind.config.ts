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
          bg: "var(--bg)",
          surface: "var(--surface)",
          surface2: "var(--surface-secondary)",
          border: "var(--border)",
          borderSubtle: "var(--border-subtle)",
          text: "var(--text)",
          muted: "var(--text-muted)",
          accent: "var(--accent)",
          accentContrast: "var(--accent-contrast)",
          green: "var(--accent)",
          warning: "#D6A83D",
          negative: "#E05252",
        },
        fpl: {
          green: "var(--accent)",
          "green-dark": "#02894a",
          dark: "var(--bg)",
          card: "var(--surface)",
          "card-hover": "var(--surface-secondary)",
          border: "var(--border)",
          muted: "var(--text-muted)",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "fade-in": "fadeIn 0.15s ease-out forwards",
        "slide-up": "slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
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
