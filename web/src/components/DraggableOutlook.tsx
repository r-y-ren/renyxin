import React from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";

interface DraggableOutlookProps {
  title: string;
  subtitle?: string;
  htmlContent: string;
}

export default function DraggableOutlook({
  title,
  subtitle,
  htmlContent,
}: DraggableOutlookProps) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const titleX = useTransform(x, (v) => `${v * 0.15}px`);
  const titleY = useTransform(y, (v) => `${v * 0.15}px`);

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
      className="glass-card bg-genshin-dark/70 border-genshin-gold/30 cursor-grab active:cursor-grabbing"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="inline-flex items-center rounded-full border border-genshin-gold/40 bg-genshin-gold/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-genshin-gold">
          关于未来
        </span>
        {subtitle && (
          <span className="text-xs text-genshin-light/60">{subtitle}</span>
        )}
      </div>

      {/* Title */}
      <motion.h2
        style={{ x: titleX, y: titleY }}
        className="genshin-title text-2xl font-extrabold tracking-tight text-genshin-light mb-4"
      >
        {title}
      </motion.h2>

      {/* HTML Content */}
      <div
        className="prose-outlook text-genshin-light/80 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </motion.div>
  );
}
