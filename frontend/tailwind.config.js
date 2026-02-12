/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#1F2937",
        input: "#1F2937",
        ring: "#3B82F6",
        background: "#02040A",
        foreground: "#FAFAFA",
        primary: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#1E293B",
          foreground: "#F8FAFC",
        },
        destructive: {
          DEFAULT: "#7F1D1D",
          foreground: "#FEF2F2",
        },
        muted: {
          DEFAULT: "#1E1E2E",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#1D4ED8",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#09090B",
          foreground: "#FAFAFA",
        },
        card: {
          DEFAULT: "#09090B",
          foreground: "#FAFAFA",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 20px rgba(59, 130, 246, 0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}