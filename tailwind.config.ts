import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2E5CFF", // Poly Blue (Accent/Buttons)
          dim: "rgba(46, 92, 255, 0.1)",
          hover: "#1A45D6",   // Deep Blue Hover
          active: "#1536A0"
        },
        surface: {
          1: "#0B0E14", // Dark background
          2: "#151924", // Cards
          3: "#1D2332", // Elevated / Hover States
        },
        border: {
          default: "#262D3D", // Border Default
          subtle: "#1F2433", // Border Subtle
          strong: "#3B455D", // Border Strong
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#94A3B8",
          muted: "#64748B",
          disabled: "#334155"
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
        "polymarket-yes": "#10B981",
        "polymarket-no": "#EF4444"
      },
      fontFamily: {
        display: ['"Inter"', '"Roboto"', '"Helvetica Neue"', 'sans-serif'],
        body: ['"Inter"', '"Roboto"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', '"Space Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      spacing: { "18": "4.5rem", "88": "22rem" },
      borderRadius: {
        DEFAULT: "10px",
        card: "16px",
        button: "10px",
        pill: "9999px",
        input: "10px",
        modal: "20px",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)",
        glow: "0 0 24px rgba(46, 92, 255, 0.15)",
        "glow-green": "0 0 16px rgba(16, 185, 129, 0.1)",
        "glow-red": "0 0 16px rgba(239, 68, 68, 0.1)",
      },
      animation: {
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "scale-in": "scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        slideUp: { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        slideDown: { from: { transform: "translateY(-10px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        scaleIn: { from: { transform: "scale(0.95)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      transitionDuration: { DEFAULT: "200ms" },
    },
  },
  plugins: [],
};
export default config;
