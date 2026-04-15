/**
 * src/components/AchievementGrid.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 成就徽章网格组件（仿 GitHub Achievement Badge 风格）。
 *
 * 功能：
 *   1. 将成就以 2/3/4 列响应式网格排列（sm:3 md:4 列）
 *   2. 每个成就为可拖拽徽章 tile（AchievementTile 子组件）：
 *        - 拖拽时 Z 轴旋转 (-15°~15°) + X 轴倾斜 (视透视深度)
 *        - 松手后弹簧回弹至原位
 *        - 常态下循环闪光 (shimmer sweep 动画)
 *        - 八边形 icon 外框 + 光晕脉冲
 *        - 入场动效：从下方淡入（viewport 触发，仅一次）
 *   3. 点击 tile → 展开成就详情弹窗（黑色模糊遮罩 + 弹簧缩放）
 *   4. 弹窗中显示大图标、分类 pill、标题、日期、纯文本描述（前 280 字符）
 *
 * 数据来源：
 *   props.achievements → index.astro 中的 sortedAchievements 数组
 *                        来源：src/content/achievements/*.md
 *                        字段：slug / data.title / data.date / data.category / data.icon / body
 *
 * 消费方：src/pages/index.astro（第 5 块内容区，client:load 激活）
 */
import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 单条成就（来自 index.astro 传入） */
interface Achievement {
  slug: string; // 文件名（不含扩展名），作为列表 key
  data: {
    title: string; // 成就标题
    date: Date; // 获得日期
    category: string; // 类别（project/certification/speaking/learning/milestone 等）
    icon?: string; // Emoji 图标（可选，默认 🏅）
  };
  body: string; // Markdown 正文（弹窗中显示前 280 字符的纯文本）
}

/** 组件 Props */
interface AchievementGridProps {
  achievements: Achievement[]; // 成就数组（已在 index.astro 按日期降序排列）
}

// ─── 类别主题配色表 ────────────────────────────────────────────────────────────
// 每种 category 对应一套颜色方案（边框/背景/文字/光晕），不同于 DraggableCard 的金色系

type CatTheme = { border: string; bg: string; text: string; glow: string };

const CAT_COLORS: Record<string, CatTheme> = {
  project: {
    // 项目 → 紫色
    border: "#a78bfa",
    bg: "rgba(167,139,250,0.13)",
    text: "#c4b5fd",
    glow: "rgba(167,139,250,0.40)",
  },
  certification: {
    // 证书 → 绿色
    border: "#34d399",
    bg: "rgba(52,211,153,0.13)",
    text: "#6ee7b7",
    glow: "rgba(52,211,153,0.40)",
  },
  speaking: {
    // 演讲 → 蓝色
    border: "#60a5fa",
    bg: "rgba(96,165,250,0.13)",
    text: "#93c5fd",
    glow: "rgba(96,165,250,0.40)",
  },
  learning: {
    // 学习 → 粉红
    border: "#f472b6",
    bg: "rgba(244,114,182,0.13)",
    text: "#f9a8d4",
    glow: "rgba(244,114,182,0.40)",
  },
  milestone: {
    // 里程碑 → 金黄
    border: "#fbbf24",
    bg: "rgba(251,191,36,0.13)",
    text: "#fcd34d",
    glow: "rgba(251,191,36,0.40)",
  },
};
/** 未匹配到预定义类别时的默认主题（金色系） */
const DEFAULT_THEME: CatTheme = {
  border: "#d4a853",
  bg: "rgba(212,168,83,0.13)",
  text: "#fcd34d",
  glow: "rgba(212,168,83,0.40)",
};

/** 根据 category 字符串（大小写不敏感）查找对应主题 */
function catTheme(category: string): CatTheme {
  return CAT_COLORS[category.toLowerCase()] ?? DEFAULT_THEME;
}

// ─── 八边形 clip-path 辅助 ────────────────────────────────────────────────────
// 用于图标容器的裁剪形状，模拟 GitHub Achievement 徽章的多边形外框

const OCTAGON =
  "polygon(30% 0%,70% 0%,100% 30%,100% 70%,70% 100%,30% 100%,0% 70%,0% 30%)";

// ─── 可拖拽徽章 tile（子组件）─────────────────────────────────────────────────
/**
 * AchievementTile：单个成就徽章卡片
 *  - drag：Framer Motion 拖拽，x/y motion values 驱动 rotateZ（倾斜感）和 rotateX（翻转感）
 *  - onDragEnd：弹簧动画回弹至原位
 *  - whileInView：入场动效（viewport 触发，once=true 不重复）
 *  - shimmer：背景光扫动效（线性渐变 translateX 动画）
 *  - onClick：由父组件 AchievementGrid 传入，触发详情弹窗
 */

function AchievementTile({
  a,
  index,
  onClick,
}: {
  a: Achievement; // 成就数据
  index: number; // 在网格中的序号（用于入场延迟和 shimmer 时序错位）
  onClick: () => void; // 点击回调 → 父组件打开详情弹窗
}) {
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // 拖拽倾斜变换：水平位移 [-180, 180] → Z 轴旋转 [-15°, 15°]
  const rotateZ = useTransform(x, [-180, 180], [-15, 15]);
  // 拖拽翻转变换：垂直位移 [-120, 120] → X 轴旋转 [10°, -10°]（负值向前倾）
  const rotateX = useTransform(y, [-120, 120], [10, -10]);
  const t = catTheme(a.data.category);

  return (
    <motion.div
      drag
      dragElastic={0.22}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 480, bounceDamping: 26 }}
      style={{ x, y, rotateZ, rotateX, perspective: 800 }}
      onDragEnd={() =>
        controls.start({
          x: 0,
          y: 0,
          transition: { type: "spring", stiffness: 240, damping: 22 },
        })
      }
      animate={controls}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.42, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="relative cursor-grab active:cursor-grabbing select-none"
    >
      {/* ── Card shell ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 flex flex-col items-center text-center"
        style={{
          background: `linear-gradient(150deg, #161b22 0%, #0d1117 80%, ${t.bg} 100%)`,
          border: `1px solid #30363d`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.45)`,
        }}
      >
        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(110deg, transparent 20%, ${t.text}18 50%, transparent 80%)`,
          }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 2.2 + index * 0.3,
          }}
        />

        {/* ── Octagonal icon frame ── */}
        <div
          className="relative mb-4 flex-shrink-0"
          style={{ width: 72, height: 72 }}
        >
          {/* Pulsing outer glow */}
          <motion.div
            className="absolute inset-[-8px] rounded-2xl"
            style={{
              background: `radial-gradient(circle, ${t.glow} 0%, transparent 68%)`,
            }}
            animate={{ opacity: [0.35, 0.75, 0.35], scale: [0.9, 1.12, 0.9] }}
            transition={{
              duration: 2.8 + index * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Icon rendered directly, no clip or border */}
          <div className="relative w-[72px] h-[72px] flex items-center justify-center text-[2.2rem] z-10">
            {a.data.icon ?? "🏅"}
          </div>
        </div>

        {/* Category pill */}
        <span
          className="inline-block rounded-full px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] mb-2"
          style={{
            background: t.bg,
            color: t.text,
            border: `1px solid ${t.border}55`,
          }}
        >
          {a.data.category}
        </span>

        {/* Title */}
        <h3
          className="font-bold text-[13px] leading-snug mb-2.5 px-1"
          style={{ color: "#e6edf3" }}
        >
          {a.data.title}
        </h3>

        {/* Date */}
        <time className="text-[11px] tabular-nums" style={{ color: "#7d8590" }}>
          {a.data.date.toLocaleDateString("zh-CN", {
            year: "numeric",
            month: "short",
          })}
        </time>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-6 right-6 h-[2px] rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${t.border}99, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
}

// ─── 网格容器（主组件）────────────────────────────────────────────────────────

export default function AchievementGrid({
  achievements,
}: AchievementGridProps) {
  // 当前选中弹窗展示的成就（null 表示弹窗关闭）
  const [selected, setSelected] = useState<Achievement | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {achievements.map((a, i) => (
          <AchievementTile
            key={a.slug}
            a={a}
            index={i}
            onClick={() => setSelected(a)}
          />
        ))}
      </div>

      {/* ── 成就详情弹窗（AnimatePresence 处理进出场动画）── */}
      <AnimatePresence>
        {selected &&
          (() => {
            const t = catTheme(selected.data.category);
            return (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelected(null)}
                  className="fixed inset-0 bg-black/65 backdrop-blur-xl z-40"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: 16 }}
                  transition={{ type: "spring", damping: 26, stiffness: 260 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                  <div
                    className="relative max-w-sm w-full rounded-3xl p-8 overflow-hidden"
                    style={{
                      background: `linear-gradient(150deg, #161b22 0%, #0d1117 80%, ${t.bg} 100%)`,
                      border: `1px solid #30363d`,
                      boxShadow: `0 32px 64px rgba(0,0,0,0.6)`,
                    }}
                  >
                    {/* Close */}
                    <motion.button
                      onClick={() => setSelected(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: t.bg,
                        border: `1px solid ${t.border}66`,
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      <span
                        className="text-sm leading-none"
                        style={{ color: t.text }}
                      >
                        ✕
                      </span>
                    </motion.button>

                    {/* Icon */}
                    <div className="flex justify-center mb-5">
                      <div
                        className="relative"
                        style={{ width: 96, height: 96 }}
                      >
                        <motion.div
                          className="absolute inset-[-10px] rounded-3xl"
                          style={{
                            background: `radial-gradient(circle, ${t.glow} 0%, transparent 68%)`,
                          }}
                          animate={{
                            opacity: [0.4, 0.9, 0.4],
                            scale: [0.88, 1.12, 0.88],
                          }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <div className="w-24 h-24 flex items-center justify-center text-5xl z-10 relative">
                          {selected.data.icon ?? "🏅"}
                        </div>
                      </div>
                    </div>

                    <div className="text-center">
                      <span
                        className="inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] mb-3"
                        style={{
                          background: t.bg,
                          color: t.text,
                          border: `1px solid ${t.border}55`,
                        }}
                      >
                        {selected.data.category}
                      </span>
                      <h2
                        className="text-xl font-bold mb-1"
                        style={{ color: "#e6edf3" }}
                      >
                        {selected.data.title}
                      </h2>
                      <time
                        className="block text-xs mb-5"
                        style={{ color: "#7d8590" }}
                      >
                        {selected.data.date.toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      {selected.body && (
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "rgba(230,237,243,0.7)" }}
                        >
                          {selected.body
                            .replace(/^---[\s\S]*?---\s*/, "")
                            .replace(/#+\s/g, "")
                            .replace(/[*_]/g, "")
                            .trim()
                            .substring(0, 280)}
                        </p>
                      )}
                    </div>

                    {/* Bottom accent line */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${t.border}88, transparent)`,
                      }}
                    />
                  </div>
                </motion.div>
              </>
            );
          })()}
      </AnimatePresence>
    </>
  );
}
