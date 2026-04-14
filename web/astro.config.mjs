import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      // Tailwind CSS 配置选项
      applyBaseStyles: true,
    }),
  ],
  // 优化配置
  vite: {
    ssr: {
      // Framer Motion 在 SSR 中需要这个配置
      external: ["framer-motion"],
    },
  },
});
