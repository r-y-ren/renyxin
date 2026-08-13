/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // 星穹档案 · 深空调色板（保留 genshin-* 名称以兼容现有组件）
        "genshin-dark": "#0a1122",
        "genshin-gold": "#e6c98f",
        "genshin-accent": "#b8936d",
        "genshin-light": "#edf1f9",
        "genshin-purple": "#9d8cf8",
        "genshin-cyan": "#8adbe8",
      },
      backgroundImage: {
        starfield:
          "radial-gradient(2px 2px at 20px 30px, white, rgba(255,255,255,0.2)), radial-gradient(2px 2px at 60px 70px, white, rgba(255,255,255,0.1))",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        twinkle: "twinkle 3.2s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      boxShadow: {
        "genshin-glow":
          "0 0 24px rgba(230,201,143,0.25), inset 0 0 24px rgba(230,201,143,0.08)",
        "genshin-inset":
          "inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.35)",
      },
      backdropBlur: {
        genshin: "18px",
      },
    },
  },
  plugins: [],
};
