import React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";

interface DraggableCardProps {
  title: string;
  subtitle?: string;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  metadata?: string[];
  accentLabel?: string;
  onClick?: () => void;
  className?: string;
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
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const titleX = useTransform(x, (value) => `${value * 0.15}px`);
  const titleY = useTransform(y, (value) => `${value * 0.15}px`);

  return (
    <motion.div
      drag
      dragElastic={0.18}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 520, bounceDamping: 28 }}
      whileTap={{ scale: 0.98 }}
      animate={controls}
      style={{ x, y }}
      onDragEnd={() =>
        controls.start({
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 220, damping: 24 },
        })
      }
      onClick={onClick}
      className={`glass-card bg-genshin-dark/70 border-genshin-gold/30 cursor-grab active:cursor-grabbing ${className}`}
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
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
        <div className="text-right text-xs text-genshin-light/60">
          {metadata.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>

      {coverImage && (
        <div className="overflow-hidden rounded-3xl border border-genshin-gold/20 mb-6 shadow-inner shadow-genshin-dark/40">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-48 object-cover transition-transform duration-500 hover:scale-105"
          />
        </div>
      )}

      <motion.h2
        style={{ x: titleX, y: titleY }}
        className="genshin-title text-3xl font-extrabold tracking-tight text-genshin-light mb-3"
      >
        {title}
      </motion.h2>

      {subtitle && (
        <p className="text-genshin-light/70 mb-4 text-sm leading-relaxed">
          {subtitle}
        </p>
      )}

      {excerpt && (
        <p className="text-genshin-light/80 mb-6 text-sm leading-relaxed">
          {excerpt}
        </p>
      )}

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
