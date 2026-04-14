import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SkillNode {
  name: string;
  x: number;
  y: number;
  connections: string[];
  proficiency: number;
  description?: string;
}

interface SkillConstellationProps {
  skills: SkillNode[];
  width?: number;
  height?: number;
}

export default function SkillConstellation({
  skills = [],
  width = 1000,
  height = 600,
}: SkillConstellationProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<SkillNode | null>(null);

  const safeSkills: SkillNode[] = Array.isArray(skills)
    ? skills
    : Array.isArray((skills as any)?.default)
      ? (skills as any).default
      : [];

  const getSkillByName = (name: string) =>
    safeSkills.find((skill: SkillNode) => skill.name === name);

  // 星星路径 (更锐利的原神命之座风格)
  const starPath =
    "M12 0 L15.5 7.5 L24 9.5 L16.5 14.5 L18 24 L12 19.5 L6 24 L7.5 14.5 L0 9.5 L8.5 7.5 Z";

  // 根据熟练度计算大小
  const getStarSize = (proficiency: number) =>
    Math.max(20, (proficiency / 100) * 42);

  if (safeSkills.length === 0) {
    return (
      <div className="relative w-full min-h-[300px] bg-genshin-dark rounded-3xl border border-genshin-gold/20 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-semibold mb-2">
            Debug: 未收到有效的技能数据
          </p>
          <p className="text-genshin-light/60 text-sm">
            请检查 blog.astro 中的 skills props 或 JSON 导入路径。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-genshin-dark overflow-hidden">
      {/* 星空背景 */}
      <div className="absolute inset-0 starfield-bg pointer-events-none" />

      <svg
        width={width}
        height={height}
        className="relative z-10 block"
        style={{ background: "transparent" }}
      >
        <defs>
          {/* 发光滤镜 */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 连线 */}
        {safeSkills.map((skill, index) =>
          skill.connections.map((connName) => {
            const connSkill = getSkillByName(connName);
            if (!connSkill) return null;
            return (
              <motion.line
                key={`${skill.name}-${connName}`}
                x1={skill.x}
                y1={skill.y}
                x2={connSkill.x}
                y2={connSkill.y}
                stroke="rgba(236, 229, 216, 0.35)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glow)"
                style={{ mixBlendMode: "screen" }}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  duration: 1.8,
                  delay: index * 0.08,
                  ease: "easeOut",
                }}
              />
            );
          }),
        )}

        {/* 星星节点 */}
        {safeSkills.map((skill, index) => {
          const size = getStarSize(skill.proficiency);
          return (
            <motion.g
              key={skill.name}
              style={{ transformOrigin: `${skill.x}px ${skill.y}px` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: index * 0.08,
                ease: "easeOut",
              }}
            >
              <motion.path
                d={starPath}
                fill="rgba(236, 229, 216, 0.92)"
                stroke="rgba(236, 229, 216, 0.4)"
                strokeWidth="1.2"
                filter="url(#glow)"
                transform={`translate(${skill.x - 12}, ${skill.y - 12}) scale(${size / 24})`}
                animate={{
                  opacity: [0.65, 1, 0.65],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 4 + index * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.2,
                }}
                onClick={() => setSelectedSkill(skill)}
                onMouseEnter={() => setHoveredSkill(skill)}
                onMouseLeave={() => setHoveredSkill(null)}
                className="cursor-pointer"
              />
            </motion.g>
          );
        })}
      </svg>

      {/* 悬浮信息框 */}
      <AnimatePresence mode="wait">
        {hoveredSkill &&
          !selectedSkill &&
          (() => {
            // ── 边缘碰撞检测 ──────────────────────────────────────────
            const TOOLTIP_W = 200; // 弹窗估计宽度（minWidth）
            const TOOLTIP_H = 140; // 弹窗估计高度（含 padding）
            const H_OFFSET = 28; // 星星右侧水平间距
            const V_OFFSET = 38; // 默认垂直偏移（相对星心向上）
            const EDGE_PAD = 12; // 翻转后与星星的间距

            const nearBottom = height - hoveredSkill.y < 150;
            const nearRight =
              width - hoveredSkill.x < TOOLTIP_W + H_OFFSET + 20;

            const tooltipLeft = nearRight
              ? hoveredSkill.x - TOOLTIP_W - EDGE_PAD // 向左翻转
              : hoveredSkill.x + H_OFFSET; // 默认右侧

            const tooltipTop = nearBottom
              ? hoveredSkill.y - TOOLTIP_H - EDGE_PAD // 向上翻转
              : hoveredSkill.y - V_OFFSET; // 默认位置

            // 入场动画方向跟随翻转方向，避免从错误方向滑入
            const initX = nearRight ? -8 : 8;
            const initY = nearBottom ? -8 : 8;
            // ──────────────────────────────────────────────────────────

            return (
              <motion.div
                key={hoveredSkill.name}
                initial={{ opacity: 0, scale: 0.82, x: initX, y: initY }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, x: initX, y: initY }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute glass-panel p-4 rounded-3xl border border-genshin-gold/20 shadow-[0_0_30px_rgba(236,229,216,0.14)] z-20 pointer-events-none"
                style={{
                  left: tooltipLeft,
                  top: tooltipTop,
                  minWidth: TOOLTIP_W,
                  backdropFilter: "blur(16px)",
                }}
              >
                <h3 className="text-genshin-gold font-bold text-lg mb-2">
                  {hoveredSkill.name}
                </h3>
                <p className="text-genshin-light/80 text-sm leading-relaxed">
                  {hoveredSkill.description || "暂无描述"}
                </p>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-genshin-light/60">
                  熟练度 {hoveredSkill.proficiency}%
                </div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* 点击详情弹窗 */}
      <AnimatePresence>
        {selectedSkill && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSkill(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
            />

            {/* 详情弹窗 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="glass-panel max-w-md w-full p-8 relative">
                {/* 关闭按钮 */}
                <motion.button
                  onClick={() => setSelectedSkill(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-genshin-accent/80 backdrop-blur-sm border border-genshin-gold/60 flex items-center justify-center group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-lg text-genshin-light group-hover:text-genshin-gold transition-colors">
                    ✕
                  </span>
                </motion.button>

                {/* 技能详情 */}
                <div className="text-center">
                  <motion.div
                    className="w-16 h-16 mx-auto mb-4"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-full h-full">
                      <path
                        d={starPath}
                        fill="rgba(236, 229, 216, 0.8)"
                        filter="url(#glow)"
                      />
                    </svg>
                  </motion.div>
                  <h2 className="text-3xl font-bold text-genshin-gradient mb-2">
                    {selectedSkill.name}
                  </h2>
                  <div className="mb-4">
                    <p className="text-genshin-light/80 mb-2">熟练度</p>
                    <div className="w-full bg-genshin-dark/50 rounded-full h-3">
                      <motion.div
                        className="bg-genshin-gold h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedSkill.proficiency}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                    <p className="text-genshin-gold text-sm mt-1">
                      {selectedSkill.proficiency}%
                    </p>
                  </div>
                  {selectedSkill.description && (
                    <p className="text-genshin-light/90 text-sm leading-relaxed">
                      {selectedSkill.description}
                    </p>
                  )}
                  {selectedSkill.connections.length > 0 && (
                    <div className="mt-4">
                      <p className="text-genshin-light/80 text-sm mb-2">
                        前置技能
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {selectedSkill.connections.map((conn) => (
                          <span
                            key={conn}
                            className="px-3 py-1 bg-genshin-accent/20 text-genshin-gold rounded-full text-xs"
                          >
                            {conn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
