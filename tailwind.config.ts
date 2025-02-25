import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        black: "var(--black)",
        red: "var(--red)",
        white: "var(--white)",
        gray: "var(--gray)",
        "red-2": "var(--red-2)",
      },
    },
  },
  plugins: [],
} satisfies Config;
