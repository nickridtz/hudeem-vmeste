import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        accent: "#22c55e",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-dark": "0 1px 3px 0 rgb(0 0 0 / 0.4)",
        soft: "0 4px 24px -8px rgb(0 0 0 / 0.12), 0 2px 8px -4px rgb(0 0 0 / 0.08)",
        glow: "0 0 0 1px rgb(34 197 94 / 0.1), 0 8px 32px -8px rgb(34 197 94 / 0.35)",
        "glow-sm": "0 4px 16px -4px rgb(34 197 94 / 0.4)",
        float: "0 12px 40px -12px rgb(0 0 0 / 0.18)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(at 0% 0%, rgb(34 197 94 / 0.08) 0px, transparent 50%), radial-gradient(at 100% 0%, rgb(99 102 241 / 0.06) 0px, transparent 50%), radial-gradient(at 100% 100%, rgb(16 185 129 / 0.07) 0px, transparent 50%)",
        "mesh-dark":
          "radial-gradient(at 0% 0%, rgb(34 197 94 / 0.12) 0px, transparent 50%), radial-gradient(at 100% 0%, rgb(99 102 241 / 0.1) 0px, transparent 50%), radial-gradient(at 100% 100%, rgb(16 185 129 / 0.1) 0px, transparent 50%)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2s infinite",
        float: "float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
