/**
 * src/components/SkillConstellation.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 技能星座图组件。
 *
 * 功能：
 *   1. 将技能按"类别（class）"分组，以星座图样式布局在 SVG 画布上
 *   2. 每个类别为一个"星簇"，各簇按环形排布于画布中心周围
 *   3. 连接线：中心 → 星簇（backbone），星簇 → 各技能星（spoke）
 *   4. 支持画布拖拽平移（Framer Motion drag，带弹性边界）
 *   5. 悬浮技能星 → 显示 tooltip（HTML，跟随 pan 偏移调整位置）
 *   6. 点击技能星 → 展开技能详情弹窗
 *   7. 第二部分：技能全览（用 DraggableCard 网格展示所有技能，按熟练度降序）
 *
 * 数据来源：
 *   props.skills → index.astro 中的 skillsData 数组
 *                  来源：src/content/skills/*.md（每文件一项技能）
 *                  字段：name / proficiency / class / description
 *
 * 消费方：src/pages/index.astro（第 4 块内容区，client:load 激活）
 *
 * 核心算法：computeClassLayout()
 *   - 按 class 分组，各组中心均匀分布在半径 R_cluster 的圆上
 *   - 组内成员均匀分布在半径 R_star 的更小圆上
 *   - 每个星的 labelDx/labelDy 为指向组外的单位向量 × 16，用于标签偏移
 */
import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import DraggableCard from "./DraggableCard";

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

/** 技能输入（来自 index.astro 映射的 skillsData 数组） */
interface SkillInput {
  name: string; // 技能名称（唯一 key）
  proficiency: number; // 熟练度 0-100
  class: string; // 技能类别（用于分组和着色）
  description?: string; // 简短描述（可选，显示在 tooltip/弹窗中）
}

/** 最终布局结果（已计算坐标）*/
interface ComputedSkill extends SkillInput {
  x: number; // 画布 X 坐标
  y: number; // 画布 Y 坐标
  classIndex: number; // 所属星簇的索引（决定颜色）
  /** 向外偏移向量（模为 16），用于标签位置偏移 */
  labelDx: number;
  labelDy: number;
}

/** 星簇中心信息 */
interface ClusterCenter {
  x: number; // 星簇中心 X
  y: number; // 星簇中心 Y
  className: string; // 类别名称（如 "frontend"）
  classIndex: number; // 颜色索引
}

/** 组件 Props */
interface SkillConstellationProps {
  skills: SkillInput[]; // 技能数组（来自 index.astro）
  width?: number; // SVG 视口宽度（默认 1000）
  height?: number; // SVG 视口高度（默认 620）
}

// ─── 颜色表 ───────────────────────────────────────────────────────────────────
// 每个星簇按 classIndex % 7 取色，颜色顺序：金/青/紫蓝/绿/橙/粉紫/翠绿

const CLASS_COLORS = [
  "#d4af70", // 金
  "#76c8df", // 青
  "#8ba5ff", // 紫蓝
  "#8fd9b6", // 绿
  "#e9a46f", // 橙
  "#d89ad7", // 粉紫
  "#7bc9a9", // 翠绿
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 生成原神风四角星路径（菱形 + 细腰），以 (0,0) 为中心，外接圆半径 R */
function getFourPointStarPath(R: number): string {
  const r = +(R * 0.2).toFixed(2);
  const R_ = +R.toFixed(2);
  return (
    `M 0 -${R_}` +
    ` L ${r} -${r}` +
    ` L ${R_} 0` +
    ` L ${r} ${r}` +
    ` L 0 ${R_}` +
    ` L -${r} ${r}` +
    ` L -${R_} 0` +
    ` L -${r} -${r} Z`
  );
}

/** 根据熟练度计算四角星大小（最小 7px，最大 22px） */
function getStarSize(proficiency: number): number {
  return Math.max(7, (proficiency / 100) * 15);
}

// ─── 布局算法 ─────────────────────────────────────────────────────────────────
/**
 * 计算所有技能的画布坐标：
 *  1. 按 class 分组
 *  2. 各星簇中心均匀分布在半径 R_cluster 的圆上（-π/2 起始，顺时针）
 *  3. 各星在本簇内均匀分布在更小的 R_star 圆上
 *  4. labelDx/Dy 为向外的单位向量 × 16，让技能名称标签向外偏移
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
      : Math.min(canvasW * 0.32, canvasH * 0.34) *
        Math.min(1.2, 0.7 + classCount * 0.12);

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

    const R_star = Math.min(120, 45 + Math.sqrt(memberCount) * 30);

    members.forEach((skill, memberIndex) => {
      const starAngle =
        memberCount <= 1
          ? clusterAngle
          : (memberIndex / memberCount) * Math.PI * 2 - Math.PI / 2;

      const sx = clusterX + Math.cos(starAngle) * R_star;
      const sy = clusterY + Math.sin(starAngle) * R_star;

      // Unit vector pointing away from cluster center, scaled to 16
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

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function SkillConstellation({
  skills = [],
  width = 1000,
  height = 620,
}: SkillConstellationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // 当前选中/悬浮的技能名称（null 表示无）
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  // 画布是否正在被拖拽（影响 cursor 样式）
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  // 平移量 motion values（由 framer-motion drag 驱动，tooltip 也读取此值跟随偏移）
  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const MAX_PAN_X = 400; // 水平最大平移量（px）
  const MAX_PAN_Y = 260; // 垂直最大平移量（px）

  // 数据清洗：过滤空名称 + 去重（同 class-name 组合），防止渲染异常
  const safeSkills: SkillInput[] = useMemo(() => {
    const raw = Array.isArray(skills)
      ? skills
      : Array.isArray(
            (skills as unknown as { default?: SkillInput[] })?.default,
          )
        ? (skills as unknown as { default: SkillInput[] }).default
        : [];
    const seen = new Set<string>();
    return raw.filter((item) => {
      const name = (item.name || "").trim();
      if (!name) return false;
      const uniqueKey = `${item.class || "未分类"}-${name}`;
      if (seen.has(uniqueKey)) return false;
      seen.add(uniqueKey);
      return true;
    });
  }, [skills]);

  // 调用布局算法，计算所有技能和星簇的坐标
  const { skills: layoutSkills, clusters } = useMemo(
    () => computeClassLayout(safeSkills, width, height),
    [safeSkills, width, height],
  );

  // 名称 → ComputedSkill 的映射，用于 O(1) 查找当前选中/悬浮技能
  const skillMap = useMemo(() => {
    const map = new Map<string, ComputedSkill>();
    for (const skill of layoutSkills) map.set(skill.name, skill);
    return map;
  }, [layoutSkills]);

  const getClassColor = (idx: number) =>
    CLASS_COLORS[idx % CLASS_COLORS.length];

  const selectedSkill = selectedName
    ? (skillMap.get(selectedName) ?? null)
    : null;
  const hoveredSkill = hoveredName ? (skillMap.get(hoveredName) ?? null) : null;

  // 按熟练度降序排列，用于第二部分"技能全览"网格
  const sortedSkills = useMemo(
    () => [...layoutSkills].sort((a, b) => b.proficiency - a.proficiency),
    [layoutSkills],
  );

  if (safeSkills.length === 0) {
    // 无技能数据时显示占位文字
    return (
      <div className="relative w-full min-h-[300px] bg-genshin-dark rounded-3xl border border-genshin-gold/20 p-8 flex items-center justify-center">
        <p className="text-genshin-light/60 text-xl">还没有添加任何技能</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-20">
      {/* ── 第一部分：SVG 星座画布 ──────────────────────────────── */}
      <div className="relative w-full bg-genshin-dark overflow-hidden rounded-3xl border border-genshin-gold/15">
        <div className="absolute inset-0 starfield-bg pointer-events-none" />

        {/*
          All nodes, lines, and labels live inside this single SVG.
          No mixed HTML/SVG coordinate systems — tooltip is the only HTML overlay,
          positioned using scaled SVG coordinates at render time.
        */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="relative z-10 block w-full"
          style={{
            background: "transparent",
            aspectRatio: `${width} / ${height}`,
            cursor: isDraggingCanvas ? "grabbing" : "grab",
          }}
        >
          <defs>
            {/* Multi-layer bloom: large outer glow + crisp core glow */}
            <filter
              id="sc-star-glow"
              x="-120%"
              y="-120%"
              width="340%"
              height="340%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="5"
                result="blur-l"
              />
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="1.8"
                result="blur-s"
              />
              <feMerge>
                <feMergeNode in="blur-l" />
                <feMergeNode in="blur-s" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle glow for spoke lines — filterUnits=userSpaceOnUse prevents
                 zero-bounding-box clipping on perfectly horizontal/vertical lines */}
            <filter
              id="sc-line-glow"
              filterUnits="userSpaceOnUse"
              x={-20}
              y={-20}
              width={width + 40}
              height={height + 40}
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="1.4"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong corona for cluster center diamonds */}
            <filter
              id="sc-cluster-glow"
              x="-160%"
              y="-160%"
              width="420%"
              height="420%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="9"
                result="blur-l"
              />
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="3"
                result="blur-s"
              />
              <feMerge>
                <feMergeNode in="blur-l" />
                <feMergeNode in="blur-s" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Dark drop-shadow for text readability */}
            <filter
              id="sc-text-shadow"
              x="-20%"
              y="-40%"
              width="140%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="2.5"
                floodColor="#000000"
                floodOpacity="0.92"
              />
            </filter>
          </defs>

          {/* ── Pannable canvas group ─────────────────────────────────
               drag is handled entirely by framer-motion:
               - dragElastic provides boundary resistance + spring bounce
               - dragMomentum=false stops instantly on release
               - child star onClick still fires on tap (framer handles disambiguation)
          ── */}
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
              setIsDraggingCanvas(true);
              setHoveredName(null);
            }}
            onDragEnd={() => setIsDraggingCanvas(false)}
          >
            {/* ── Layer 0: Backbone lines — canvas center → each cluster ── */}
            {clusters.length > 1 &&
              clusters.map((cluster, ci) => (
                <motion.path
                  key={`backbone-${cluster.className}`}
                  d={`M ${width / 2} ${height / 2} L ${cluster.x} ${cluster.y}`}
                  stroke={getClassColor(cluster.classIndex)}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.3 }}
                  transition={{
                    duration: 1.4,
                    delay: ci * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              ))}

            {/* ── Layer 1: Spoke lines with pathLength growth animation ── */}
            {clusters.map((cluster, ci) => {
              const color = getClassColor(cluster.classIndex);
              const members = layoutSkills.filter(
                (s) => s.classIndex === cluster.classIndex,
              );
              return members.map((skill, mi) => (
                <motion.path
                  key={`spoke-${cluster.className}-${skill.name}`}
                  d={`M ${cluster.x} ${cluster.y} L ${skill.x + 0.01} ${skill.y + 0.01}`}
                  stroke={color}
                  strokeWidth={1.1}
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#sc-line-glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  transition={{
                    duration: 1.1,
                    delay: ci * 0.2 + mi * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              ));
            })}

            {/* ── Layer 2: Cluster center diamonds with breathing ── */}
            {clusters.map((cluster, ci) => {
              const color = getClassColor(cluster.classIndex);
              const R = 11;
              return (
                <motion.g
                  key={`cluster-${cluster.className}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55, delay: ci * 0.18 + 0.25 }}
                >
                  {/* Translate to cluster position so children use local coords */}
                  <g transform={`translate(${cluster.x} ${cluster.y})`}>
                    {/* Pulsing outer halo — pure SVG glow, no harsh edge */}
                    <motion.circle
                      cx={0}
                      cy={0}
                      r={R * 1.8}
                      fill={color}
                      filter="url(#sc-cluster-glow)"
                      animate={{
                        r: [R * 1.6, R * 2.7, R * 1.6],
                        opacity: [0, 0.2, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: ci * 0.55,
                      }}
                    />
                    {/* Diamond icon with slow scale breathing */}
                    <motion.path
                      d={getFourPointStarPath(R)}
                      fill={color}
                      filter="url(#sc-cluster-glow)"
                      animate={{
                        scale: [1, 1.16, 1],
                        opacity: [0.85, 1, 0.85],
                      }}
                      transition={{
                        duration: 3.4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: ci * 0.3,
                      }}
                    />
                  </g>

                  {/* Class label — outside breathing group so it stays stable */}
                  <motion.text
                    x={cluster.x}
                    y={cluster.y - R - 9}
                    textAnchor="middle"
                    fill={color}
                    fontSize="11"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="0.14em"
                    filter="url(#sc-text-shadow)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.92 }}
                    transition={{ duration: 0.5, delay: ci * 0.18 + 0.65 }}
                  >
                    {cluster.className}
                  </motion.text>
                </motion.g>
              );
            })}

            {/* ── Layer 3: Skill stars (four-point, pure SVG glow) ── */}
            {layoutSkills.map((skill, idx) => {
              const skillKey = `${skill.class}-${skill.name}`;
              const size = getStarSize(skill.proficiency);
              const color = getClassColor(skill.classIndex);
              const isActive =
                hoveredName === skill.name || selectedName === skill.name;

              // Outward text position: place label along the spoke direction
              const lMag = Math.sqrt(skill.labelDx ** 2 + skill.labelDy ** 2);
              const textDist = size + 13;
              const textX =
                lMag > 0
                  ? skill.x + (skill.labelDx / lMag) * textDist
                  : skill.x;
              const textY =
                lMag > 0
                  ? skill.y + (skill.labelDy / lMag) * textDist
                  : skill.y + textDist;
              const textAnchor: "start" | "end" | "middle" =
                skill.labelDx > 3
                  ? "start"
                  : skill.labelDx < -3
                    ? "end"
                    : "middle";

              return (
                <motion.g
                  key={skillKey}
                  style={{
                    transformOrigin: `${skill.x}px ${skill.y}px`,
                    cursor: "pointer",
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: isActive ? 1.3 : 1 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.65 + idx * 0.055,
                    ease: "backOut",
                  }}
                  onClick={() => setSelectedName(skill.name)}
                  onMouseEnter={() => setHoveredName(skill.name)}
                  onMouseLeave={() =>
                    setHoveredName((prev) =>
                      prev === skill.name ? null : prev,
                    )
                  }
                >
                  {/* Oversized transparent hit area for easier interaction */}
                  <circle
                    cx={skill.x}
                    cy={skill.y}
                    r={size + 10}
                    fill="transparent"
                  />

                  {/* Four-point star — no background circle, glow via SVG filter only */}
                  <g transform={`translate(${skill.x} ${skill.y})`}>
                    <motion.path
                      d={getFourPointStarPath(size)}
                      fill={color}
                      filter="url(#sc-star-glow)"
                      animate={{ opacity: [0.68, 1, 0.68] }}
                      transition={{
                        duration: 3 + idx * 0.22,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </g>

                  {/* Skill name — outward offset, sans-serif, text-shadow */}
                  <motion.text
                    x={textX}
                    y={textY}
                    textAnchor={textAnchor}
                    dominantBaseline="middle"
                    fill="rgba(236,229,216,0.78)"
                    fontSize="10"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    letterSpacing="0.04em"
                    filter="url(#sc-text-shadow)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {skill.name}
                  </motion.text>
                </motion.g>
              );
            })}
          </motion.g>
        </svg>

        {/* ── Hover tooltip (HTML, positioned via scaled SVG coords) ── */}
        <AnimatePresence mode="wait">
          {hoveredSkill &&
            !selectedSkill &&
            (() => {
              const TW = 220;
              const TH = 160;
              const H_OFF = 30;
              const V_OFF = 40;
              const EDGE = 12;

              const scaleX = svgRef.current
                ? svgRef.current.clientWidth / width
                : 1;
              const scaleY = svgRef.current
                ? svgRef.current.clientHeight / height
                : scaleX;
              // Add pan offset (CSS pixels) so tooltip tracks with the panned canvas
              const sx = hoveredSkill.x * scaleX + panX.get();
              const sy = hoveredSkill.y * scaleY + panY.get();
              const containerW = width * scaleX;
              const containerH = height * scaleY;

              const nearBottom = containerH - sy < 170;
              const nearRight = containerW - sx < TW + H_OFF + 20;
              const tipLeft = nearRight ? sx - TW - EDGE : sx + H_OFF;
              const tipTop = nearBottom ? sy - TH - EDGE : sy - V_OFF;
              const color = getClassColor(hoveredSkill.classIndex);

              return (
                <motion.div
                  key={hoveredSkill.name}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute glass-panel p-4 rounded-2xl border shadow-[0_0_28px_rgba(236,229,216,0.12)] z-20 pointer-events-none"
                  style={{
                    left: tipLeft,
                    top: tipTop,
                    minWidth: TW,
                    borderColor: `${color}55`,
                    backdropFilter: "blur(18px)",
                  }}
                >
                  <p
                    className="text-xs uppercase tracking-widest mb-0.5 opacity-60"
                    style={{ color }}
                  >
                    {hoveredSkill.class}
                  </p>
                  <h3 className="font-bold text-base mb-1.5" style={{ color }}>
                    {hoveredSkill.name}
                  </h3>
                  <p className="text-genshin-light/75 text-sm leading-relaxed mb-3">
                    {hoveredSkill.description || "暂无描述"}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${hoveredSkill.proficiency}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-genshin-light/60 tabular-nums">
                      {hoveredSkill.proficiency}%
                    </span>
                  </div>
                </motion.div>
              );
            })()}
        </AnimatePresence>

        {/* ── Selected skill modal ── */}
        <AnimatePresence>
          {selectedSkill && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedName(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-lg z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.84, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.84, y: 12 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
              >
                <div className="glass-panel max-w-sm w-full p-8 relative rounded-3xl border border-genshin-gold/30">
                  <motion.button
                    onClick={() => setSelectedName(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-genshin-accent/80 border border-genshin-gold/50 flex items-center justify-center"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-sm text-genshin-light leading-none">
                      ✕
                    </span>
                  </motion.button>

                  <div className="text-center">
                    <p
                      className="text-xs uppercase tracking-widest mb-1 opacity-60"
                      style={{ color: getClassColor(selectedSkill.classIndex) }}
                    >
                      {selectedSkill.class}
                    </p>
                    <h2
                      className="text-2xl font-bold mb-4"
                      style={{ color: getClassColor(selectedSkill.classIndex) }}
                    >
                      {selectedSkill.name}
                    </h2>
                    <div className="mb-4 text-left">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-genshin-light/60 uppercase tracking-widest">
                          熟练度
                        </span>
                        <span className="font-bold tabular-nums text-genshin-light">
                          {selectedSkill.proficiency}%
                        </span>
                      </div>
                      <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: getClassColor(selectedSkill.classIndex),
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedSkill.proficiency}%` }}
                          transition={{ duration: 0.75, delay: 0.15 }}
                        />
                      </div>
                    </div>
                    <p className="text-genshin-light/80 text-sm leading-relaxed text-left">
                      {selectedSkill.description || "暂无描述"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── 第二部分：技能全览网格（DraggableCard）─────────────── */}
      <div>
        <div className="text-center mb-10">
          <h3
            className="text-2xl font-bold tracking-wider mb-1.5"
            style={{
              background:
                "linear-gradient(90deg, #ece5d8 0%, #d6b88e 55%, #b8936d 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            技能全览
          </h3>
          <p className="text-genshin-light/40 text-xs tracking-[0.28em] uppercase">
            Skill Overview · {safeSkills.length} skills · {clusters.length}{" "}
            classes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedSkills.map((skill) => (
            <DraggableCard
              key={skill.name}
              title={skill.name}
              subtitle={skill.description || "暂无描述"}
              excerpt={`${skill.class} · 熟练度 ${skill.proficiency}%`}
              tags={[skill.class]}
              metadata={[`熟练度 ${skill.proficiency}%`, skill.class]}
              accentLabel="技能"
              onClick={() => setSelectedName(skill.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
