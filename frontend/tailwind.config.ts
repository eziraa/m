import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#040b1d",
        neon: "#00a6ff",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0, 171, 255, 0.35), 0 12px 40px rgba(0, 60, 132, 0.35)",
      },
      backgroundImage: {
        "star-grid":
          "radial-gradient(circle at 25% 20%, rgba(35, 127, 255, 0.35) 0, rgba(3, 10, 31, 0) 34%), radial-gradient(circle at 75% 0%, rgba(0, 216, 255, 0.17) 0, rgba(3, 10, 31, 0) 30%), linear-gradient(180deg, #020817 0%, #030b1f 48%, #061229 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
