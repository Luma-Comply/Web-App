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
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Luma custom colors — navy/blue/beige system
        "dark-bg": "#0F1629",
        "light-gray": "#E8EAF0",
        "sage-light": "#EDEDE7", // now beige-light (kept name for Tailwind class compat)
        "sage-medium": "#E7E7D9", // now beige-medium (kept name for Tailwind class compat)
        "sage-dark": "#DDD9CC", // now beige-dark (kept name for Tailwind class compat)
        mint: "#1652C5", // now brand blue (kept name for Tailwind class compat)
        "mint-light": "#5B8DEF", // now bright blue (kept name for Tailwind class compat)
        tan: "#19408B", // now medium blue accent
        "tan-light": "#7BA8F7", // now light blue
        coral: "#EC624F", // signature accent — moments of emphasis only
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "elevation-border": "0 0 0 1px rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.04)",
        "elevation-sm": "0 1px 2px rgba(0,0,0,.05), 0 1px 3px rgba(0,0,0,.04)",
        "elevation-md": "0 2px 4px rgba(0,0,0,.04), 0 4px 8px rgba(0,0,0,.06)",
        "elevation-lg": "0 4px 8px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08)",
        "elevation-xl": "0 8px 16px rgba(0,0,0,.06), 0 20px 40px rgba(0,0,0,.1)",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "logo-pulse-red": {
          "0%, 100%": { fill: "#B8C1D4" },
          "50%": { fill: "#D68F85" }, // Softer coral emphasis
        },
      },
      animation: {
        "logo-pulse-red": "logo-pulse-red 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
