/**
 * src/components/SkillConstellation.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · 技能星座 v2（命之座）
 *
 * 交互设计：
 *   1. 悬浮星点 → 「充电」：能量脉冲沿 backbone/spoke 星轨流向该星，
 *      火花粒子迸发，熟练度光环展开
 *   2. 点击星点 → 「命星」：光环定格为熟练度占比，右侧面板滑入详情
 *      （星等称号 / ★ 评级 / 动画熟练度条 / 本簇进度 / 定位星簇）
 *   3. 点击簇心菱形或顶部分类芯片 → 聚焦该星簇，其余星域隐退变暗
 *   4. 拖拽平移（弹性边界） + 整幅星图 3D 鼠标视差
 *   5. 环境生命：尘埃粒子漂浮、中心星核呼吸光环与慢旋轨道、随机流星
 *
 * 结构约定：每个交互元素分两层 ——
 *   外层 motion.g 负责「聚焦淡化」（快速过渡），
 *   内层 motion.g 负责「入场动画 + 悬停缩放」（互不干扰）。
 *
 * 数据来源：props.skills（index.astro 由 src/content/skills/*.md 映射而来）
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

// ─── 类型 ───────────────────────────────────────────────────────────────────────

interface SkillInput {
  name: string;
  proficiency: number;
  class: string;
  description?: string;
}

interface ComputedSkill extends SkillInput {
  x: number;
  y: number;
  classIndex: number;
  labelDx: number;
  labelDy: number;
}

interface ClusterCenter {
  x: number;
  y: number;
  className: string;
  classIndex: number;
}

interface SkillConstellationProps {
  skills: SkillInput[];
  width?: number;
  height?: number;
}

// ─── 常量 ───────────────────────────────────────────────────────────────────────

const CLASS_COLORS = [
  "#d4af70", // 金
  "#76c8df", // 青
  "#8ba5ff", // 紫蓝
  "#8fd9b6", // 绿
  "#e9a46f", // 橙
  "#d89ad7", // 粉紫
  "#7bc9a9", // 翠绿
];

const EASE = [0.22, 1, 0.36, 1];

// ─── 工具 ───────────────────────────────────────────────────────────────────────

function getClassColor(i: number): string {
  return CLASS_COLORS[i % CLASS_COLORS.length];
}

/** 颜色提亮（生成五角星纵向渐变的高光端） */
function shade(hex: string, ratio: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return "rgb(" + mix(r) + "," + mix(g) + "," + mix(b) + ")";
}

/** 五角星路径（尖角朝上），以 (0,0) 为中心，外接圆半径 R */
function getFivePointStarPath(R: number, innerRatio = 0.45): string {
  const outer: number[][] = [];
  const inner: number[][] = [];
  const step = (Math.PI * 2) / 5;
  for (let i = 0; i < 5; i++) {
    const aO = -Math.PI / 2 + i * step;
    const aI = aO + step / 2;
    outer.push([Math.cos(aO) * R, Math.sin(aO) * R]);
    inner.push([Math.cos(aI) * R * innerRatio, Math.sin(aI) * R * innerRatio]);
  }
  let d = "";
  for (let i = 0; i < 5; i++) {
    d +=
      (i === 0 ? "M " : "L ") +
      outer[i][0].toFixed(2) + " " + outer[i][1].toFixed(2);
    d += " L " + inner[i][0].toFixed(2) + " " + inner[i][1].toFixed(2);
  }
  return d + " Z";
}

/** 熟练度 → 星点半径（6~21px） */
function getStarSize(proficiency: number): number {
  return Math.max(6, (proficiency / 100) * 15);
}

/** 星等称号（命座风味） */
function tierOf(p: number): { name: string; color: string } {
  if (p >= 85) return { name: "恒耀", color: "#f4e3bd" };
  if (p >= 65) return { name: "璀璨", color: "#e6c98f" };
  if (p >= 45) return { name: "闪烁", color: "#b8936d" };
  if (p >= 25) return { name: "初芒", color: "#8a94b8" };
  return { name: "微光", color: "#6b7690" };
}

/** 确定性伪随机（火花粒子） */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * 布局算法：按 class 分组，星簇中心均匀分布在环上，
 * 组内成员均匀分布在小环上，label 向量朝外。
 */
function computeClassLayout(
  items: SkillInput[],
  canvasW: number,
  canvasH: number,
): { skills: ComputedSkill[]; clusters: ClusterCenter[] } {
  const classMap = new Map<string, SkillInput[]>();
  for (const item of items) {
    const c = (item.class || "未分类").trim();
    if (!classMap.has(c)) classMap.set(c, []);
    classMap.get(c)!.push(item);
  }

  const classNames = Array.from(classMap.keys());
  const classCount = classNames.length;
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  const R_cluster =
    classCount <= 1
      ? 0
      : Math.min(canvasW * 0.3, canvasH * 0.32) *
        Math.min(1.25, 0.72 + classCount * 0.11);

  const clusters: ClusterCenter[] = [];
  const computedSkills: ComputedSkill[] = [];

  classNames.forEach((className, classIndex) => {
    const members = classMap.get(className)!;
    const memberCount = members.length;

    const clusterAngle =
      classCount <= 1
        ? 0
        : (classIndex / classCount) * Math.PI * 2 - Math.PI / 2;

    const clusterX = cx + Math.cos(clusterAngle) * R_cluster;
    const clusterY = cy + Math.sin(clusterAngle) * R_cluster;

    clusters.push({ x: clusterX, y: clusterY, className, classIndex });

    const R_star = Math.min(110, 42 + Math.sqrt(memberCount) * 28);

    members.forEach((skill, memberIndex) => {
      const starAngle =
        memberCount <= 1
          ? clusterAngle
          : (memberIndex / memberCount) * Math.PI * 2 - Math.PI / 2;

      const sx = clusterX + Math.cos(starAngle) * R_star;
      const sy = clusterY + Math.sin(starAngle) * R_star;

      const dx = sx - clusterX;
      const dy = sy - clusterY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      computedSkills.push({
        ...skill,
        class: skill.class || "未分类",
        x: sx,
        y: sy,
        classIndex,
        labelDx: (dx / dist) * 16,
        labelDy: (dy / dist) * 16,
      });
    });
  });

  return { skills: computedSkills, clusters };
}

// ─── 子组件 ─────────────────────────────────────────────────────────────────────

/** 星轨能量脉冲：沿直线往返流动的光点 */
function LinePulse({
  from,
  to,
  color,
  duration = 1.5,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  duration?: number;
}) {
  return (
    <motion.circle
      r={2.6}
      fill={color}
      filter="url(#sc-pulse-glow)"
      initial={{ cx: from.x, cy: from.y, opacity: 0 }}
      animate={{
        cx: [from.x, to.x, from.x],
        cy: [from.y, to.y, from.y],
        opacity: [0, 1, 0],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      style={{ pointerEvents: "none" }}
    />
  );
}

/** 火花粒子迸发（悬浮/选中星点） */
function Sparkles({
  x,
  y,
  color,
  seed,
}: {
  x: number;
  y: number;
  color: string;
  seed: number;
}) {
  const parts = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const ang = hash01(seed + i * 1.7) * Math.PI * 2;
        const dist = 15 + hash01(seed + i * 3.1) * 21;
        return {
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist,
          r: 1 + hash01(seed + i * 5.3) * 1.8,
          dur: 0.8 + hash01(seed + i * 7.9) * 0.7,
          delay: i * 0.07,
        };
      }),
    [seed],
  );

  return (
    <g style={{ pointerEvents: "none" }}>
      {parts.map((p, i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={p.r}
          fill={color}
          initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: [0, 0.95, 0],
            x: p.dx,
            y: p.dy,
            scale: 0.25,
          }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "easeOut",
            delay: p.delay,
          }}
        />
      ))}
    </g>
  );
}

/** ★ 评级（五星按百分比填充） */
function StarRating({ value }: { value: number }) {
  return (
    <div
      className="relative inline-flex text-lg leading-none tracking-[0.2em] select-none"
      role="img"
      aria-label={"熟练度 " + value + "%"}
    >
      <span className="text-white/15">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden text-genshin-gold"
        style={{ width: value + "%" }}
      >
        ★★★★★
      </span>
    </div>
  );
}

// ─── 主组件 ─────────────────────────────────────────────────────────────────────

export default function SkillConstellation({
  skills = [],
  width = 900,
  height = 560,
}: SkillConstellationProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [focusClass, setFocusClass] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const panX = useMotionValue(0);
  const panY = useMotionValue(0);

  // 动态拖拽边界：随容器实际尺寸缩放，避免小屏把星域拖出视野
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellSize, setShellSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const update = () => setShellSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const MAX_PAN_X = Math.max(70, Math.round(shellSize.w * 0.2));
  const MAX_PAN_Y = Math.max(50, Math.round(shellSize.h * 0.22));

  // 3D 鼠标视差
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [3.2, -3.2]), {
    stiffness: 80,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-4.2, 4.2]), {
    stiffness: 80,
    damping: 15,
  });

  // 数据清洗
  const safeSkills: SkillInput[] = useMemo(() => {
    const raw = Array.isArray(skills) ? skills : [];
    const seen = new Set<string>();
    return raw.filter((item) => {
      const name = (item.name || "").trim();
      if (!name) return false;
      const uniqueKey = (item.class || "未分类") + "-" + name;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
  }, [skills]);

  const { skills: layoutSkills, clusters } = useMemo(
    () => computeClassLayout(safeSkills, width, height),
    [safeSkills, width, height],
  );

  const skillMap = useMemo(() => {
    const map = new Map<string, ComputedSkill>();
    for (const skill of layoutSkills) map.set(skill.name, skill);
    return map;
  }, [layoutSkills]);

  const selected = selectedName ? (skillMap.get(selectedName) ?? null) : null;
  const hovered = hoveredName ? (skillMap.get(hoveredName) ?? null) : null;
  const active = selected ?? hovered;

  const core = { x: width / 2, y: height / 2 };

  // 环境尘埃（确定性）
  const dust = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: hash01(i * 13.7) * width,
        y: hash01(i * 29.3) * height,
        r: 0.7 + hash01(i * 7.1) * 1.1,
        dur: 2.6 + hash01(i * 11.9) * 3.4,
        delay: hash01(i * 3.3) * 4,
      })),
    [width, height],
  );

  // 总览统计
  const stats = useMemo(() => {
    const total = safeSkills.length;
    const avg = total
      ? Math.round(safeSkills.reduce((s, k) => s + k.proficiency, 0) / total)
      : 0;
    const top = [...safeSkills].sort((a, b) => b.proficiency - a.proficiency)[0];
    return { total, avg, top };
  }, [safeSkills]);

  const classStats = useMemo(
    () =>
      clusters.map((c) => {
        const members = layoutSkills.filter((s) => s.class === c.className);
        const avg = members.length
          ? Math.round(
              members.reduce((s, m) => s + m.proficiency, 0) / members.length,
            )
          : 0;
        return {
          className: c.className,
          color: getClassColor(c.classIndex),
          count: members.length,
          avg,
        };
      }),
    [clusters, layoutSkills],
  );

  const dimmed = (cls: string) =>
    focusClass && cls !== focusClass ? 0.14 : 1;

  if (safeSkills.length === 0) {
    return (
      <div className="relative w-full min-h-[320px] rounded-3xl border border-genshin-gold/20 bg-genshin-dark/60 p-8 flex items-center justify-center">
        <p className="text-genshin-light/60 text-xl">还没有添加任何技能</p>
      </div>
    );
  }

  const chipCls = (isActive: boolean) =>
    "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] transition-all duration-300 " +
    (isActive
      ? "border-genshin-gold/70 text-genshin-gold bg-genshin-gold/10 shadow-[0_0_18px_rgba(230,201,143,0.18)]"
      : "border-white/10 text-dim hover:border-white/25 hover:text-text");

  return (
    <div>
      {/* ── 分类聚焦芯片 ── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          className={chipCls(!focusClass)}
          onClick={() => setFocusClass(null)}
        >
          <span className="text-genshin-gold">✦</span> 全部
        </button>
        {classStats.map((c) => (
          <button
            key={c.className}
            className={chipCls(focusClass === c.className)}
            onClick={() =>
              setFocusClass(focusClass === c.className ? null : c.className)
            }
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: c.color, boxShadow: "0 0 8px " + c.color }}
            />
            {c.className}
            <span className="opacity-60 tabular-nums">{c.count}</span>
          </button>
        ))}
        <span className="ml-auto hidden md:block text-xs text-muted tracking-wider">
          拖拽平移 · 双击复位 · 悬浮充电 · 点击查看详情
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ═══ 星图 ═══ */}
        <div
          ref={shellRef}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(160deg,rgba(20,31,60,0.55),rgba(6,10,20,0.9))]"
          onMouseMove={(e) => {
            if (isDragging) return;
            const r = e.currentTarget.getBoundingClientRect();
            tiltX.set((e.clientX - r.left) / r.width - 0.5);
            tiltY.set((e.clientY - r.top) / r.height - 0.5);
          }}
          onMouseLeave={() => {
            tiltX.set(0);
            tiltY.set(0);
          }}
        >
          <div className="absolute inset-0 starfield-bg pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(46% 40% at 50% 46%, rgba(230,201,143,0.07), transparent 70%), radial-gradient(30% 34% at 16% 18%, rgba(139,165,255,0.08), transparent 70%), radial-gradient(28% 30% at 86% 82%, rgba(138,219,232,0.07), transparent 70%)",
            }}
          />

          <div style={{ perspective: 1400 }}>
            <motion.div
              style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            >
              <svg
                viewBox={"0 0 " + width + " " + height}
                className="relative z-10 block w-full"
                style={{
                  background: "transparent",
                  aspectRatio: width + " / " + height,
                  cursor: isDragging ? "grabbing" : "grab",
                }}
                role="img"
                aria-label="技能星图：拖拽平移，悬浮星点查看，点击查看详情"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedName(null);
                }}
              >
                <defs>
                  <filter id="sc-star-glow" x="-120%" y="-120%" width="340%" height="340%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b2" />
                    <feMerge>
                      <feMergeNode in="b1" />
                      <feMergeNode in="b2" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="sc-line-glow" filterUnits="userSpaceOnUse" x={-20} y={-20} width={width + 40} height={height + 40}>
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="sc-cluster-glow" x="-160%" y="-160%" width="420%" height="420%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b2" />
                    <feMerge>
                      <feMergeNode in="b1" />
                      <feMergeNode in="b2" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="sc-pulse-glow" x="-260%" y="-260%" width="620%" height="620%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="sc-text-shadow" x="-20%" y="-40%" width="140%" height="180%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.92" />
                  </filter>
                  <radialGradient id="sc-core-glow">
                    <stop offset="0%" stopColor="rgba(230,201,143,0.5)" />
                    <stop offset="38%" stopColor="rgba(230,201,143,0.16)" />
                    <stop offset="100%" stopColor="rgba(230,201,143,0)" />
                  </radialGradient>
                  {CLASS_COLORS.map((c, i) => (
                    <React.Fragment key={"grad-" + i}>
                      <linearGradient id={"sc-grad-" + i} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={shade(c, 0.6)} />
                        <stop offset="100%" stopColor={c} />
                      </linearGradient>
                      <radialGradient id={"sc-node-" + i}>
                        <stop offset="0%" stopColor={c} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={c} stopOpacity="0" />
                      </radialGradient>
                    </React.Fragment>
                  ))}
                </defs>

                {/* 环境尘埃 */}
                {dust.map((d, i) => (
                  <motion.circle
                    key={i}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill="rgba(226,232,255,0.6)"
                    animate={{ opacity: [0.12, 0.7, 0.12], scale: [0.8, 1.3, 0.8] }}
                    transition={{ duration: d.dur, repeat: Infinity, ease: "easeInOut", delay: d.delay }}
                    style={{ pointerEvents: "none" }}
                  />
                ))}

                {/* ── 可拖拽星域（星核随星座一起平移，保证星轨始终相连）── */}
                <motion.g
                  drag
                  dragConstraints={{
                    left: -MAX_PAN_X,
                    right: MAX_PAN_X,
                    top: -MAX_PAN_Y,
                    bottom: MAX_PAN_Y,
                  }}
                  dragElastic={0.12}
                  dragMomentum={false}
                  style={{ x: panX, y: panY }}
                  onDragStart={() => {
                    setIsDragging(true);
                    setHoveredName(null);
                    tiltX.set(0);
                    tiltY.set(0);
                  }}
                  onDragEnd={() => setIsDragging(false)}
                  onDoubleClick={() => {
                    // 双击星域：弹簧复位到中心
                    animate(panX, 0, { type: "spring", stiffness: 150, damping: 17 });
                    animate(panY, 0, { type: "spring", stiffness: 150, damping: 17 });
                  }}
                >
                  {/* ── 中心星核（随星域平移）── */}
                  <g transform={"translate(" + core.x + " " + core.y + ")"} style={{ pointerEvents: "none" }}>
                    <motion.circle
                      r={62}
                      fill="url(#sc-core-glow)"
                      animate={{ opacity: [0.55, 1, 0.55], scale: [0.94, 1.08, 0.94] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {[0, 1, 2].map((i) => (
                      <motion.circle
                        key={i}
                        r={12}
                        fill="none"
                        stroke="rgba(230,201,143,0.4)"
                        strokeWidth={1}
                        animate={{ r: [12, 74], opacity: [0.55, 0] }}
                        transition={{ duration: 3.8, repeat: Infinity, ease: "easeOut", delay: i * 1.27 }}
                      />
                    ))}
                    <motion.g
                      animate={{ rotate: 360 }}
                      transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
                    >
                      <circle r={30} fill="none" stroke="rgba(230,201,143,0.35)" strokeWidth={1} strokeDasharray="3 6" />
                    </motion.g>
                    <path
                      d={getFivePointStarPath(13)}
                      fill="url(#sc-grad-0)"
                      stroke="#e6c98f"
                      strokeWidth={1}
                      strokeLinejoin="round"
                      filter="url(#sc-star-glow)"
                    />
                    <circle r={1.6} fill="rgba(255,255,255,0.95)" />
                  </g>

                  {/* backbone：星核 → 簇心 */}
                  {clusters.length > 1 &&
                    clusters.map((cluster, ci) => {
                      const color = getClassColor(cluster.classIndex);
                      const focused = focusClass === cluster.className;
                      const pulseHere =
                        !!active &&
                        active.class === cluster.className &&
                        (focused || !focusClass);
                      return (
                        <motion.g
                          key={"bb-" + cluster.className}
                          animate={{ opacity: dimmed(cluster.className) }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        >
                          <motion.path
                            d={"M " + core.x + " " + core.y + " L " + cluster.x + " " + cluster.y}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.32 }}
                            transition={{ duration: 1.4, delay: ci * 0.14, ease: EASE }}
                            style={{ pointerEvents: "none" }}
                          />
                          {pulseHere && (
                            <LinePulse from={core} to={cluster} color={color} duration={1.9} />
                          )}
                        </motion.g>
                      );
                    })}

                  {/* spoke：簇心 → 技能星 */}
                  {clusters.map((cluster) => {
                    const color = getClassColor(cluster.classIndex);
                    const members = layoutSkills.filter(
                      (s) => s.classIndex === cluster.classIndex,
                    );
                    return members.map((skill, mi) => {
                      const isActiveStar = !!active && active.name === skill.name;
                      return (
                        <motion.g
                          key={"spk-" + skill.name}
                          animate={{ opacity: dimmed(cluster.className) }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        >
                          <motion.path
                            d={"M " + cluster.x + " " + cluster.y + " L " + (skill.x + 0.01) + " " + (skill.y + 0.01)}
                            stroke={color}
                            strokeWidth={isActiveStar ? 2 : 1.1}
                            fill="none"
                            strokeLinecap="round"
                            filter="url(#sc-line-glow)"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: isActiveStar ? 0.85 : 0.5 }}
                            transition={{ duration: 1.1, delay: cluster.classIndex * 0.18 + mi * 0.08, ease: EASE }}
                            style={{ pointerEvents: "none" }}
                          />
                          {isActiveStar && (
                            <LinePulse from={cluster} to={skill} color={color} />
                          )}
                        </motion.g>
                      );
                    });
                  })}

                  {/* 簇心菱形（可点击聚焦） */}
                  {clusters.map((cluster, ci) => {
                    const color = getClassColor(cluster.classIndex);
                    const focused = focusClass === cluster.className;
                    const R = 11;
                    return (
                      <motion.g
                        key={"cluster-" + cluster.className}
                        role="button"
                        tabIndex={0}
                        aria-label={"聚焦分类 " + cluster.className}
                        style={{ cursor: "pointer", outline: "none" }}
                        animate={{ opacity: dimmed(cluster.className) }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusClass(focused ? null : cluster.className);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setFocusClass(focused ? null : cluster.className);
                          }
                        }}
                      >
                        {/* 入场层（仅入场一次） */}
                        <motion.g
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.55, delay: ci * 0.16 + 0.2 }}
                        >
                          <g transform={"translate(" + cluster.x + " " + cluster.y + ")"}>
                            <motion.circle
                              cx={0}
                              cy={0}
                              r={R * 1.8}
                              fill={color}
                              filter="url(#sc-cluster-glow)"
                              animate={{ r: [R * 1.5, R * 2.6, R * 1.5], opacity: [0, 0.2, 0] }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: ci * 0.55 }}
                              style={{ pointerEvents: "none" }}
                            />
                            <circle
                              r={R * 2.1}
                              fill={"url(#sc-node-" + cluster.classIndex + ")"}
                              style={{ pointerEvents: "none" }}
                            />
                            <motion.g
                              animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
                              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: ci * 0.3 }}
                              style={{ pointerEvents: "none" }}
                            >
                              <path
                                d={getFivePointStarPath(focused ? R + 3 : R + 1)}
                                fill={"url(#sc-grad-" + cluster.classIndex + ")"}
                                stroke={color}
                                strokeWidth={1}
                                strokeLinejoin="round"
                                filter="url(#sc-cluster-glow)"
                              />
                              <circle r={1.4} fill="rgba(255,255,255,0.9)" />
                            </motion.g>
                          </g>
                          <motion.text
                            x={cluster.x}
                            y={cluster.y - R - 10}
                            textAnchor="middle"
                            fill={color}
                            fontSize="11"
                            fontFamily="system-ui, -apple-system, sans-serif"
                            letterSpacing="0.14em"
                            filter="url(#sc-text-shadow)"
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {cluster.className}
                          </motion.text>
                        </motion.g>
                      </motion.g>
                    );
                  })}

                  {/* 技能星点 */}
                  {layoutSkills.map((skill, idx) => {
                    const key = skill.class + "-" + skill.name;
                    const size = getStarSize(skill.proficiency);
                    const color = getClassColor(skill.classIndex);
                    const isSel = selectedName === skill.name;
                    const isHov = hoveredName === skill.name;
                    const ringVisible = isSel || isHov;
                    const C = 2 * Math.PI * (size + 9);

                    // 标签位置：沿 spoke 方向向外
                    const lMag = Math.sqrt(skill.labelDx ** 2 + skill.labelDy ** 2);
                    const textDist = size + 15;
                    const textX = lMag > 0 ? skill.x + (skill.labelDx / lMag) * textDist : skill.x;
                    const textY = lMag > 0 ? skill.y + (skill.labelDy / lMag) * textDist : skill.y + textDist;
                    const textAnchor: "start" | "end" | "middle" =
                      skill.labelDx > 3 ? "start" : skill.labelDx < -3 ? "end" : "middle";

                    return (
                      /* 外层：聚焦淡化 + 交互事件 */
                      <motion.g
                        key={key}
                        role="button"
                        tabIndex={0}
                        aria-label={
                          skill.name + "，熟练度 " + skill.proficiency + "%" +
                          (skill.description ? "，" + skill.description : "")
                        }
                        style={{ cursor: "pointer", outline: "none" }}
                        animate={{ opacity: dimmed(skill.class) }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedName(isSel ? null : skill.name);
                        }}
                        onMouseEnter={() => setHoveredName(skill.name)}
                        onMouseLeave={() =>
                          setHoveredName((prev) => (prev === skill.name ? null : prev))
                        }
                        onFocus={() => setHoveredName(skill.name)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedName(isSel ? null : skill.name);
                          }
                        }}
                      >
                        {/* 内层：入场（stagger 淡入）+ 悬停/选中弹簧缩放 */}
                        <motion.g
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{
                            opacity: 1,
                            scale: isSel ? 1.22 : isHov ? 1.12 : 1,
                          }}
                          transition={{
                            opacity: { duration: 0.45, delay: 0.5 + idx * 0.045, ease: "easeOut" },
                            scale: { type: "spring", stiffness: 300, damping: 20 },
                          }}
                        >
                          <g transform={"translate(" + skill.x + " " + skill.y + ")"}>
                            {/* 命中区 */}
                            <circle r={size + 14} fill="transparent" />

                            {/* 熟练度光环（悬浮/选中展开） */}
                            <g transform="rotate(-90)">
                              <motion.circle
                                r={size + 9}
                                fill="none"
                                stroke={color}
                                strokeWidth={1.6}
                                strokeLinecap="round"
                                strokeDasharray={C}
                                initial={false}
                                animate={{
                                  strokeDashoffset: ringVisible
                                    ? C * (1 - skill.proficiency / 100)
                                    : C,
                                  opacity: ringVisible ? 0.95 : 0,
                                }}
                                transition={{ duration: 0.65, ease: EASE }}
                                style={{ pointerEvents: "none" }}
                              />
                            </g>

                            {/* 选中态外晕 */}
                            {isSel && (
                              <motion.circle
                                r={size + 18}
                                fill={color}
                                opacity={0.12}
                                filter="url(#sc-cluster-glow)"
                                animate={{ opacity: [0.1, 0.22, 0.1] }}
                                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                                style={{ pointerEvents: "none" }}
                              />
                            )}

                            {/* 柔和星云底光 */}
                            <circle
                              r={size * 1.9}
                              fill={"url(#sc-node-" + skill.classIndex + ")"}
                              style={{ pointerEvents: "none" }}
                            />

                            {/* 五角星主体：纵向渐变 + 柔化尖角 + 星芒 + 高光点 */}
                            <motion.g
                              animate={{ opacity: [0.8, 1, 0.8] }}
                              transition={{
                                duration: 3 + idx * 0.22,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                              style={{ pointerEvents: "none" }}
                            >
                              <path
                                d={getFivePointStarPath(size * 0.95)}
                                fill={"url(#sc-grad-" + skill.classIndex + ")"}
                                stroke={color}
                                strokeWidth={1.1}
                                strokeLinejoin="round"
                                filter="url(#sc-star-glow)"
                              />
                              <circle
                                r={Math.max(1.1, size * 0.11)}
                                fill="rgba(255,255,255,0.95)"
                              />
                            </motion.g>
                          </g>

                          {/* 名称 */}
                          <motion.text
                            x={textX}
                            y={textY}
                            textAnchor={textAnchor}
                            dominantBaseline="middle"
                            fill="rgba(237,241,249,0.8)"
                            fontSize={isSel || isHov ? 11.5 : 10}
                            fontFamily="system-ui, -apple-system, sans-serif"
                            letterSpacing="0.04em"
                            filter="url(#sc-text-shadow)"
                            animate={{ opacity: isSel || isHov ? 1 : 0.82 }}
                            transition={{ duration: 0.3 }}
                            style={{ pointerEvents: "none", userSelect: "none" }}
                          >
                            {skill.name}
                          </motion.text>
                        </motion.g>

                        {/* 火花粒子（不随内层缩放） */}
                        {(isSel || isHov) && (
                          <Sparkles x={skill.x} y={skill.y} color={color} seed={idx * 31 + skill.classIndex} />
                        )}
                      </motion.g>
                    );
                  })}
                </motion.g>
              </svg>
            </motion.div>
          </div>
        </div>

        {/* ═══ 侧边面板 ═══ */}
        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(165deg,rgba(20,31,60,0.6),rgba(8,13,26,0.9))] backdrop-blur-xl p-6 lg:p-7 min-h-[320px]">
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(230,201,143,0.5), transparent)",
            }}
          />
          <AnimatePresence mode="wait">
            {selected ? (
              /* ── 详情 ── */
              <motion.div
                key={"detail-" + selected.name}
                initial={{ opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex items-center justify-center w-14 h-14 rounded-2xl border"
                      style={{
                        borderColor: getClassColor(selected.classIndex) + "66",
                        background:
                          "radial-gradient(circle at 50% 38%, " +
                          getClassColor(selected.classIndex) +
                          "2e, transparent 72%)",
                      }}
                    >
                      <svg width="30" height="30" viewBox="-16 -16 32 32" aria-hidden="true">
                        <path
                          d={getFivePointStarPath(12)}
                          fill={"url(#sc-grad-" + selected.classIndex + ")"}
                          stroke={getClassColor(selected.classIndex)}
                          strokeWidth={0.8}
                          strokeLinejoin="round"
                          filter="url(#sc-star-glow)"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold tracking-wide text-genshin-light leading-tight">
                        {selected.name}
                      </h3>
                      <p
                        className="text-[11px] uppercase tracking-[0.22em] mt-1"
                        style={{ color: getClassColor(selected.classIndex) }}
                      >
                        {selected.class}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedName(null)}
                    className="w-8 h-8 rounded-full border border-white/10 text-muted hover:text-genshin-gold hover:border-genshin-gold/50 transition-colors flex items-center justify-center"
                    aria-label="关闭详情"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] tracking-[0.16em]"
                    style={{
                      color: tierOf(selected.proficiency).color,
                      borderColor: tierOf(selected.proficiency).color + "55",
                      background: tierOf(selected.proficiency).color + "12",
                    }}
                  >
                    ✦ 星等 · {tierOf(selected.proficiency).name}
                  </span>
                  <StarRating value={selected.proficiency} />
                  <span className="text-sm tabular-nums text-dim">
                    {selected.proficiency}%
                  </span>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] mb-2">
                    <span className="text-muted">熟练度</span>
                    <span className="text-gold tabular-nums">
                      {selected.proficiency}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, #b8936d, #e6c98f, #8adbe8)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: selected.proficiency + "%" }}
                      transition={{ duration: 0.9, delay: 0.12, ease: EASE }}
                    />
                    <motion.div
                      className="absolute inset-y-0 w-8 -skew-x-12 bg-white/40 blur-[6px]"
                      initial={{ left: "-12%" }}
                      animate={{ left: "112%" }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        repeatDelay: 1.2,
                        ease: "easeInOut",
                      }}
                    />
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-dim mb-6">
                  {selected.description || "暂无描述"}
                </p>

                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 mb-6">
                  <span className="text-xs text-muted tracking-wider">
                    本簇星位 ·{" "}
                    {
                      layoutSkills.filter((s) => s.class === selected.class)
                        .length
                    }{" "}
                    颗命星
                  </span>
                  <button
                    onClick={() => setFocusClass(selected.class)}
                    className="text-xs text-genshin-cyan hover:text-genshin-gold transition-colors tracking-wider"
                  >
                    定位该星簇 →
                  </button>
                </div>

                <button
                  onClick={() => setSelectedName(null)}
                  className="w-full btn btn-ghost !py-2.5 !text-sm"
                >
                  回到星图总览
                </button>
              </motion.div>
            ) : (
              /* ── 总览 ── */
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 26 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-4">
                  Sky Atlas · 总览
                </p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "技能", value: String(stats.total) },
                    { label: "平均", value: stats.avg + "%" },
                    { label: "星簇", value: String(clusters.length) },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-4 text-center"
                    >
                      <div className="stat-num text-gold-grad !text-2xl">
                        {s.value}
                      </div>
                      <div className="text-[10px] text-muted tracking-[0.24em] mt-1">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {stats.top && (
                  <div className="flex items-center gap-3 rounded-2xl border border-genshin-gold/25 bg-genshin-gold/[0.06] px-4 py-3 mb-6">
                    <span className="text-genshin-gold">✦</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted tracking-[0.2em]">
                        最闪耀之星
                      </p>
                      <p className="text-sm font-semibold text-genshin-light truncate">
                        {stats.top.name}
                        <span className="text-gold ml-2 tabular-nums">
                          {stats.top.proficiency}%
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-[11px] uppercase tracking-[0.24em] text-muted mb-3">
                  星簇分布
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {classStats.map((c) => (
                    <button
                      key={c.className}
                      onClick={() =>
                        setFocusClass(focusClass === c.className ? null : c.className)
                      }
                      className="group text-left w-full"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: c.color, boxShadow: "0 0 8px " + c.color }}
                        />
                        <span className="text-[13px] text-dim group-hover:text-text transition-colors">
                          {c.className}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {c.count} 项
                        </span>
                        <span className="ml-auto text-[11px] tabular-nums" style={{ color: c.color }}>
                          {c.avg}%
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: c.color }}
                          initial={{ width: 0 }}
                          animate={{ width: c.avg + "%" }}
                          transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                <p className="text-xs leading-relaxed text-muted">
                  悬浮星点为其「充电」，点击即可点亮命星并查看详情；
                  点击簇心菱形或上方分类芯片可聚焦单一星簇。
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
