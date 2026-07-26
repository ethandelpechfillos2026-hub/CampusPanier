import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          cream: "#FFF8F0",
          sand: "#F5E6D3",
          terracotta: "#E07A5F",
          terracottaDark: "#C96A52",
          sage: "#81B29A",
          sageDark: "#6A9A82",
          ink: "#3D405B",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
