import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FBF3E6",
        linen: "#F5E5D2",
        wine: "#8B3A4A",
        rose: "#C85A6A",
        gold: "#B98A2F",
        ink: "#2F2427",
        moss: "#4E7C59",
        coral: "#D45B4A",
        info: "#3A6EA5"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(47, 36, 39, 0.10)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-lora)", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
