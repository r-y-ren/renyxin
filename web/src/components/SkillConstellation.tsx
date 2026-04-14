import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DraggableCard from "./DraggableCard";

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

const STAR_PATH =
  "M12 0 L15.5 7.5 L24 9.5 L16.5 14.5 L18 24 L12 19.5 L6 24 L7.5 14.5 L0 9.5 L8.5 7.5 Z";

const CLASS_COLORS = [
  "#d4af70",
  "#76c8df",
  "#8ba5ff",
  "#8fd9b6",
  "#e9a46f",
  "#d89ad7",
  "#7bc9a9",
];

function getStarSize(proficiency: number): number {
  return Math.max(18, (proficiency / 100) * 40);
}

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

  // Cluster ring radius scales with canvas size and number of classes.
  // Single class → stays at center
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

    // Evenly spread cluster centers, start from top (-π/2)
    const clusterAngle =
      classCount <= 1
        ? 0
        : (classIndex / classCount) * Math.PI * 2 - Math.PI / 2;

    const clusterX = cx + Math.cos(clusterAngle) * R_cluster;
    const clusterY = cy + Math.sin(clusterAngle) * R_cluster;

    clusters.push({ x: clusterX, y: clusterY, className, classIndex });

    // Per-cluster spoke radius scales with sqrt of member count
    const R_star =
      memberCount <= 1 ? 0 : Math.min(80, 28 + Math.sqrt(memberCount) * 24);

    members.forEach((skill, memberIndex) => {
      const starAngle =
        memberCount <= 1
          ? 0
          : (memberIndex / memberCount) * Math.PI * 2 - Math.PI / 2;

      computedSkills.push({
        ...skill,
        class: skill.class || "未分类",
        x: clusterX + Math.cos(starAngle) * R_star,
        y: clusterY + Math.sin(starAngle) * R_star,
        classIndex,
      });
    });
  });

  return { skills: computedSkills, clusters };
}
export default function SkillConstellation({
  skills = [],
  width = 1000,
  height = 620,
}: SkillConstellationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

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
      if (seen.has(name)) return false;
      seen.add(name);
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

  const getClassColor = (classIndex: number): string =>
    CLASS_COLORS[classIndex % CLASS_COLORS.length];

  const selectedSkill = selectedName
    ? (skillMap.get(selectedName) ?? null)
    : null;
  const hoveredSkill = hoveredName ? (skillMap.get(hoveredName) ?? null) : null;

  const sortedSkills = useMemo(
    () => [...layoutSkills].sort((a, b) => b.proficiency - a.proficiency),
    [layoutSkills],
  );

  const classCount = clusters.length;

  if (safeSkills.length === 0) {
    return (
      <div className="relative w-full min-h-[300px] bg-genshin-dark rounded-3xl border border-genshin-gold/20 p-8 flex items-center justify-center">
        <p className="text-genshin-light/60 text-xl">还没有添加任何技能</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-20">
      <div className="relative w-full bg-genshin-dark overflow-hidden rounded-3xl border border-genshin-gold/15">
        <div className="absolute inset-0 starfield-bg pointer-events-none" />

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="relative z-10 block w-full"
          style={{
            background: "transparent",
            aspectRatio: `${width} / ${height}`,
          }}
        >
          <defs>
            <filter id="sc-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Radial spokes: cluster center → each member star */}
          {clusters.map((cluster) => {
            const color = getClassColor(cluster.classIndex);
            const members = layoutSkills.filter(
              (s) => s.classIndex === cluster.classIndex,
            );
            return members.map((skill, idx) => (
              <motion.line
                key={`spoke-${skill.name}`}
                x1={cluster.x}
                y1={cluster.y}
                x2={skill.x}
                y2={skill.y}
                stroke={`${color}77`}
                strokeWidth={1.5}
                strokeLinecap="round"
                filter="url(#sc-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{
                  duration: 0.6,
                  delay: idx * 0.06,
                  ease: "easeOut",
                }}
              />
            ));
          })}

          {/* Cluster center dots + labels */}
          {clusters.map((cluster) => {
            const color = getClassColor(cluster.classIndex);
            return (
              <g key={`cluster-${cluster.className}`}>
                <motion.circle
                  cx={cluster.x}
                  cy={cluster.y}
                  r={5}
                  fill={color}
                  filter="url(#sc-glow)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.85 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                />
                <motion.text
                  x={cluster.x}
                  y={cluster.y - 13}
                  textAnchor="middle"
                  fill={color}
                  fontSize="13"
                  fontFamily="Georgia, serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.9 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                >
                  {cluster.className}
                </motion.text>
              </g>
            );
          })}

          {/* Stars */}
          {layoutSkills.map((skill, index) => {
            const size = getStarSize(skill.proficiency);
            const color = getClassColor(skill.classIndex);
            const isActive =
              hoveredName === skill.name || selectedName === skill.name;

            return (
              <motion.g
                key={skill.name}
                style={{
                  transformOrigin: `${skill.x}px ${skill.y}px`,
                  cursor: "pointer",
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: isActive ? 1.22 : 1 }}
                transition={{
                  duration: 0.38,
                  delay: index * 0.05,
                  ease: "easeOut",
                }}
                onClick={() => setSelectedName(skill.name)}
                onMouseEnter={() => setHoveredName(skill.name)}
                onMouseLeave={() =>
                  setHoveredName((prev) => (prev === skill.name ? null : prev))
                }
              >
                <motion.circle
                  cx={skill.x}
                  cy={skill.y}
                  r={size * 0.9}
                  fill={color}
                  opacity={0.1}
                  filter="url(#sc-glow)"
                  animate={{ r: [size * 0.75, size * 1.1, size * 0.75] }}
                  transition={{
                    duration: 3 + index * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.path
                  d={STAR_PATH}
                  fill={color}
                  filter="url(#sc-glow)"
                  transform={`translate(${skill.x - 12}, ${skill.y - 12}) scale(${size / 24})`}
                  animate={{ opacity: [0.66, 1, 0.66] }}
                  transition={{
                    duration: 3.6 + index * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.text
                  x={skill.x}
                  y={skill.y + size / 2 + 15}
                  textAnchor="middle"
                  fill="rgba(236,229,216,0.82)"
                  fontSize="11"
                  fontFamily="Georgia, serif"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {skill.name}
                </motion.text>
              </motion.g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
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
              const sx = hoveredSkill.x * scaleX;
              const sy = hoveredSkill.y * scaleY;
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
                  initial={{ opacity: 0, scale: 0.84 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.84 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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

        {/* Selected skill modal */}
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

      {/* Part 2: Skill Overview */}
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
            Skill Overview · {safeSkills.length} skills · {classCount} classes
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
