/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,js}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        primary: "#4D7CFF",
        accent: "#00E0FF",
        surface: "#0B0B0F",
        muted: "#A9B3C1",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 80px -40px rgba(77,124,255,0.45)",
        "glow-sm": "0 0 60px -30px rgba(0,224,255,0.4)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "system-ui", "-apple-system", "Inter", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #4D7CFF 0%, #00E0FF 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        blob: {
          "0%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(-20px,-10px) scale(1.05)" },
          "66%": { transform: "translate(10px,-20px) scale(0.98)" },
          "100%": { transform: "translate(0,0) scale(1)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 4.5s ease-in-out infinite",
        blob: "blob 9s ease-in-out infinite",
        "fade-up": "fadeUp .8s ease-out forwards",
      },
    },
  },
  plugins: [],
}