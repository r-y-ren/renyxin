/**
 * src/components/DraggableCard.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 通用可拖拽卡片组件（原神毛玻璃风格）。
 *
 * 功能：
 *   - 支持在父容器内自由拖拽，松手后弹簧回原点
 *   - 标题随拖拽产生 0.15x 的视差偏移，增强 3D 深度感
 *   - 支持封面图、标签、元数据、强调标签、点击回调
 *
 * 消费方：
 *   src/components/BlogGrid.tsx → 博客文章列表中的每张卡片
 *   src/components/SkillConstellation.tsx → 技能详情弹窗（可能使用）
 *
 * 说明：此组件不直接读取 Content Collections，数据由父组件传入。
 */
import React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";

/**
 * 组件 Props 接口
 */
interface DraggableCardProps {
  title: string; // 卡片主标题（必填）
  subtitle?: string; // 副标题 / 摘要文字（可选）
  excerpt?: string; // 额外摘要段落（可选，与 subtitle 同时使用时分行显示）
  coverImage?: string; // 封面图路径，相对于 public/（可选）
  tags?: string[]; // 标签数组，渲染为金色圆角徽章（默认 []）
  metadata?: string[]; // 元数据行（如日期、slug 等），显示在卡片右上角（默认 []）
  accentLabel?: string; // 左上角强调标签文字（如 "博客"），未提供时显示 "可拖拽卡片"
  onClick?: () => void; // 点击卡片回调（BlogGrid 用于打开展开弹窗）
  className?: string; // 额外 CSS 类名（默认 ""）
}

export default function DraggableCard({
  title,
  subtitle,
  excerpt,
  coverImage,
  tags = [],
  metadata = [],
  accentLabel,
  onClick,
  className = "",
}: DraggableCardProps) {
  // 命令式动画控制器：松手后触发归位动画
  const controls = useAnimation();
  // 拖拽运动值：记录 x/y 位移
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // 标题视差：拖动量 × 0.15，赋给标题的 translate
  const titleX = useTransform(x, (value) => `${value * 0.15}px`);
  const titleY = useTransform(y, (value) => `${value * 0.15}px`);

  return (
    <motion.div
      drag // 允许自由拖拽
      dragElastic={0.18} // 超出边界时的弹性
      dragMomentum={false} // 禁用松手惯性
      dragTransition={{ bounceStiffness: 520, bounceDamping: 28 }}
      whileTap={{ scale: 0.98 }} // 点击缩小反馈
      animate={controls}
      style={{ x, y }}
      onDragEnd={() =>
        // 拖拽结束 → 弹簧回到 x=0, y=0（视觉原点）
        controls.start({
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 220, damping: 24 },
        })
      }
      onClick={onClick}
      className={`glass-card bg-genshin-dark/70 border-genshin-gold/30 cursor-grab active:cursor-grabbing ${className}`}
    >
      {/* ── 卡片头部：强调标签 + 元数据（右对齐多行） ──────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          {/* 左上角强调标签：有值时显示金色版，否则显示灰色默认版 */}
          {accentLabel ? (
            <span className="inline-flex items-center rounded-full border border-genshin-gold/40 bg-genshin-gold/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-genshin-gold">
              {accentLabel}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-genshin-gold/20 bg-genshin-dark/80 px-3 py-1 text-xs text-genshin-light/70">
              可拖拽卡片
            </span>
          )}
        </div>
        {/* 右侧元数据区（如 "📅 2026/04/15"、"blog/xxx-slug"） */}
        <div className="text-right text-xs text-genshin-light/60">
          {metadata.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>

      {/* ── 封面图（可选）：圆角大图，悬停放大 ──────────────────────────────── */}
      {coverImage && (
        <div className="overflow-hidden rounded-3xl border border-genshin-gold/20 mb-6 shadow-inner shadow-genshin-dark/40">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      )}

      {/* ── 主标题（带视差效果）───────────────────────────────────────────────── */}
      <motion.h2
        style={{ x: titleX, y: titleY }}
        className="genshin-title text-3xl font-extrabold tracking-tight text-genshin-light mb-3"
      >
        {title}
      </motion.h2>

      {/* ── 副标题 / 摘要（可选）──────────────────────────────────────────────── */}
      {subtitle && (
        <p className="text-genshin-light/70 mb-4 text-sm leading-relaxed">
          {subtitle}
        </p>
      )}

      {/* ── 额外摘要（可选）──────────────────────────────────────────────────── */}
      {excerpt && (
        <p className="text-genshin-light/80 mb-6 text-sm leading-relaxed">
          {excerpt}
        </p>
      )}

      {/* ── 标签列表：金色圆角徽章 ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-genshin-gold/30 bg-genshin-accent/10 px-3 py-1 text-xs text-genshin-gold"
          >
            #{tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
