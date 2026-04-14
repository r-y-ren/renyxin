/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      // 自定义颜色
      colors: {
        // 原神风格主题
        "genshin-dark": "#0c1220", // 深邃夜空蓝
        "genshin-gold": "#ece5d8", // 淡金色
        "genshin-accent": "#b8936d", // 暖金色（中间调）
        "genshin-light": "#f5f1e8", // 浅色背景
        "genshin-purple": "#7b68ee", // 深紫色点缀
      },

      // 自定义背景图像（用于星空）
      backgroundImage: {
        starfield:
          "radial-gradient(2px 2px at 20px 30px, white, rgba(255, 255, 255, 0.2)), radial-gradient(2px 2px at 60px 70px, white, rgba(255, 255, 255, 0.1))",
      },

      // 自定义动画
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },

      // 自定义阴影
      boxShadow: {
        "genshin-glow":
          "0 0 20px rgba(236, 229, 216, 0.3), inset 0 0 20px rgba(236, 229, 216, 0.1)",
        "genshin-inset":
          "inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.3)",
      },

      // 自定义模糊效果
      backdropBlur: {
        genshin: "10px",
      },
    },
  },
  plugins: [],
};
