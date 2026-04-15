/**
 * src/components/DraggableOutlook.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * "关于未来"可拖拽卡片组件。
 *
 * 功能：
 *   - 可在父容器内自由拖拽（dragElastic-弹性回弹）
 *   - 松手后通过弹簧动画自动回到原点（spring 弹簧恢复）
 *   - 拖拽时标题会沿拖动方向产生轻微视差偏移（titleX/Y = v * 0.15）
 *
 * 数据来源：
 *   props.title       → src/content/site-info/outlook.md → frontmatter.title
 *   props.subtitle    → src/content/site-info/outlook.md → frontmatter.subtitle
 *   props.htmlContent → src/content/site-info/outlook.md → 正文，由 index.astro
 *                       通过 marked.parse() 转换为 HTML 后传入
 *
 * 消费方：src/pages/index.astro（第 6 块内容区，"关于未来"卡片）
 */
import React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";

/** 组件 Props 接口 */
interface DraggableOutlookProps {
  title: string; // 卡片主标题，来自 site-info/outlook frontmatter.title
  subtitle?: string; // 卡片副标题，来自 site-info/outlook frontmatter.subtitle（可选）
  htmlContent: string; // 已渲染的 HTML 正文，由 marked.parse 从 Markdown 转换而来
}

export default function DraggableOutlook({
  title,
  subtitle,
  htmlContent,
}: DraggableOutlookProps) {
  // useAnimation：命令式动画控制器，用于拖拽松手后触发弹簧回原点
  const controls = useAnimation();
  // x/y：framer-motion 的运动值，记录卡片当前拖拽位移
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // 标题视差：拖动 100px → 标题偏移 15px（0.15 倍），产生深度感
  const titleX = useTransform(x, (v) => `${v * 0.15}px`);
  const titleY = useTransform(y, (v) => `${v * 0.15}px`);

  return (
    <motion.div
      drag // 允许在任意方向拖拽
      dragElastic={0.18} // 超出边界时的弹性系数（0=无弹性，1=完全弹性）
      dragMomentum={false} // 禁用松手后的惯性继续滑动
      dragTransition={{ bounceStiffness: 520, bounceDamping: 28 }} // 边界回弹参数
      whileTap={{ scale: 0.98 }} // 按下时轻微缩小，提供触感反馈
      animate={controls} // 绑定命令式控制器
      style={{ x, y }} // 将运动值绑定到 CSS transform
      onDragEnd={() =>
        // 松手后触发弹簧动画，将卡片平滑归位到原点（x=0, y=0）
        controls.start({
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 220, damping: 24 },
        })
      }
      className="glass-card bg-genshin-dark/70 border-genshin-gold/30 cursor-grab active:cursor-grabbing"
    >
      {/* ── 卡片头部：标签徽章 + 副标题 ─────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {/* 固定标签（展望类型标识） */}
        <span className="inline-flex items-center rounded-full border border-genshin-gold/40 bg-genshin-gold/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-genshin-gold">
          关于未来
        </span>
        {/* 副标题（可选，来自 frontmatter.subtitle，通常为时间跨度描述） */}
        {subtitle && (
          <span className="text-xs text-genshin-light/60">{subtitle}</span>
        )}
      </div>

      {/* ── 卡片主标题（带视差效果）──────────────────────────────────────────── */}
      <motion.h2
        style={{ x: titleX, y: titleY }} // 视差：位移量为拖拽位移的 15%
        className="genshin-title text-2xl font-extrabold tracking-tight text-genshin-light mb-4"
      >
        {title}
      </motion.h2>

      {/* ── 正文内容（Markdown → HTML，以 dangerouslySetInnerHTML 注入）──────── */}
      {/* 样式由 index.astro <style> 中的 .prose-outlook 规则控制 */}
      <div
        className="prose-outlook text-genshin-light/80 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </motion.div>
  );
}
