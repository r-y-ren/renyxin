/**
 * src/components/ContributionGraph.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 每日日志贡献热力图组件（仿 GitHub Contribution Graph 风格，原神配色）。
 *
 * 功能：
 *   1. 渲染过去 53 周（约一年）的日历格子热力图
 *   2. 根据每天日志条目数量映射到 0-4 级颜色（金色深浅）
 *   3. 点击格子 → 展示当日日志列表（支持点击跳转详情页）
 *   4. 悬停格子 → Tooltip 显示日期和条目数
 *   5. 未来日期格子置灰（isFuture = true）
 *
 * 数据来源：
 *   props.logs → index.astro 中的 dailyLogs 数组
 *               来源：src/content/daily-log/*.md（每文件一条日志）
 *               字段：slug（链接用）/ date（YYYY-MM-DD）/ title
 *
 * 导出接口：
 *   DailyLogEntry — 供 index.astro import type 使用，确保类型一致
 *
 * 消费方：src/pages/index.astro（第 2 块内容区，client:load 激活）
 */
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── 公开类型定义（供外部导入使用）──────────────────────────────────────────────

/** 每日日志条目：由 index.astro 从 daily-log 集合映射而来 */
export interface DailyLogEntry {
  slug: string; // 文件名（不含扩展名），用于构造 /daily-log/<slug> 链接
  date: string; // ISO 日期字符串 "YYYY-MM-DD"，与热力图格子 dateKey 对齐
  title: string; // 日志标题，显示在点击后的日志列表中
}

/** 组件 Props */
interface Props {
  logs: DailyLogEntry[]; // 所有日志条目（不限时间范围，内部过滤最近一年）
}

// ─── 布局常量 ─────────────────────────────────────────────────────────────────

const CELL_SIZE = 12; // 每个格子的边长（px）
const CELL_GAP = 3; // 格子间距（px）
const CELL_STEP = CELL_SIZE + CELL_GAP; // 格子步长 = 边长 + 间距
const WEEKS = 53; // 总列数（约一年 = 53 周）
const DAYS_IN_WEEK = 7; // 每列行数（周日~周六）

/**
 * 原神主题贡献等级颜色映射（0=无条目 → 4=最亮金色）
 * 透明度梯度：0.04 → 0.20 → 0.45 → 0.72 → 1.00
 */
const LEVEL_COLORS = [
  "rgba(255,255,255,0.04)", // 0 – 无条目（极暗白，几乎不可见）
  "rgba(212,175,112,0.20)", // 1 – 有条目（淡金）
  "rgba(212,175,112,0.45)", // 2 – 中等
  "rgba(212,175,112,0.72)", // 3 – 较多
  "rgba(212,175,112,1.00)", // 4+ – 最活跃（纯金）
];

/** SVG 左侧星期标签（只显示周一/三/五） */
const WEEKDAY_LABELS = ["一", "三", "五"];
/** 对应的 SVG 行索引（0-indexed，周日=0，周一=1...） */
const WEEKDAY_ROWS = [1, 3, 5];

/** 月份中文名称（索引 0=1月...11=12月） */
const MONTH_NAMES = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 将 Date 格式化为 "YYYY-MM-DD" 字符串（与 DailyLogEntry.date 保持一致） */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 将日志条目数量映射到颜色等级索引（0-4）
 * n=0 → 0，n=1 → 1，n=2 → 2，n=3 → 3，n>=4 → 4
 */
function countToLevel(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

export default function ContributionGraph({ logs }: Props) {
  // 当前被点击选中的日期（YYYY-MM-DD），用于展示该日的日志列表
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── 构建日期 → 日志条目的 Map（提升查询性能）──────────────────────────────
  // 每个日期可能对应多条日志（如算法日志 2026-04-15-algo 和 2026-04-15 同天）
  const entryMap = useMemo(() => {
    const map = new Map<string, DailyLogEntry[]>();
    for (const log of logs) {
      const key = log.date.slice(0, 10); // 取前 10 位确保格式一致
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  // ── 生成 53 周格子数据 + 月份标签 ────────────────────────────────────────
  // 从当前日期往前推 52 周的周日作为起始日期，生成完整格子数组
  const { grid, monthMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 找到本周日（getDay()=0 即为今天；否则往前推到最近的周日）
    const dayOfWeek = today.getDay(); // 0=周日
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    // 起始日期 = 上述周日向前推 52 周
    const startDate = new Date(lastSunday);
    startDate.setDate(lastSunday.getDate() - (WEEKS - 1) * 7);

    // grid[week][day] = { dateKey: string, count: number, isFuture: boolean }
    const grid: Array<
      Array<{ dateKey: string; count: number; isFuture: boolean }>
    > = [];
    const seenMonths = new Set<string>();
    // 月份标签：记录每个月第一次出现的列索引，用于 SVG 顶部标注
    const monthMarkers: Array<{ weekIndex: number; label: string }> = [];

    for (let w = 0; w < WEEKS; w++) {
      const week: Array<{ dateKey: string; count: number; isFuture: boolean }> =
        [];
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const key = toDateKey(date);
        const isFuture = date > today; // 未来日期不显示颜色
        week.push({
          dateKey: key,
          count: entryMap.get(key)?.length ?? 0, // 该日志条目数（0 表示无记录）
          isFuture,
        });

        // 每周第一天（d=0）检查是否该月份首次出现，添加月份标签
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (d === 0 && !seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          monthMarkers.push({
            weekIndex: w,
            label: MONTH_NAMES[date.getMonth()],
          });
        }
      }
      grid.push(week);
    }

    return { grid, monthMarkers };
  }, [entryMap]);

  // 当前选中日期的日志条目列表（用于底部列表展示）
  const selectedEntries = selectedDate
    ? (entryMap.get(selectedDate) ?? [])
    : [];

  // SVG 画布尺寸（24px 左边距留给星期标签，20px 顶边距留给月份标签）
  const svgWidth = WEEKS * CELL_STEP - CELL_GAP + 24;
  const svgHeight = DAYS_IN_WEEK * CELL_STEP - CELL_GAP + 20;

  return (
    <div className="glass-panel flex flex-col gap-4 select-none">
      {/* ── 头部：标题 + "过去一年"标签 ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-widest text-genshin-gold">
          每日进程
        </h2>
        <span className="text-xs text-genshin-light/40">过去一年</span>
      </div>

      {/* ── 热力图 SVG ──────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: "block", minWidth: svgWidth }}
          aria-label="贡献热力图"
        >
          {/* 顶部月份标签：每月第一列上方显示月份名 */}
          {monthMarkers.map(({ weekIndex, label }) => (
            <text
              key={`month-${weekIndex}`}
              x={24 + weekIndex * CELL_STEP}
              y={10}
              fontSize={9}
              fill="rgba(245,241,232,0.45)"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          ))}

          {/* 左侧星期标签（周一/三/五） */}
          {WEEKDAY_LABELS.map((label, i) => (
            <text
              key={`wd-${label}`}
              x={0}
              y={20 + WEEKDAY_ROWS[i] * CELL_STEP + CELL_SIZE * 0.75}
              fontSize={9}
              fill="rgba(245,241,232,0.35)"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          ))}

          {/* 热力图格子：按周列/天行渲染矩形 */}
          {grid.map((week, wi) =>
            week.map((cell, di) => {
              const isSelected = cell.dateKey === selectedDate;
              // 未来日期强制等级 0（不显示颜色）
              const level = cell.isFuture ? 0 : countToLevel(cell.count);
              const cx = 24 + wi * CELL_STEP;
              const cy = 20 + di * CELL_STEP;

              return (
                <motion.rect
                  key={cell.dateKey}
                  x={cx}
                  y={cy}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  ry={2}
                  fill={LEVEL_COLORS[level]}
                  stroke={isSelected ? "rgba(212,175,112,0.9)" : "transparent"}
                  strokeWidth={1.5}
                  style={{ cursor: cell.count > 0 ? "pointer" : "default" }}
                  whileHover={
                    cell.count > 0
                      ? {
                          scale: 1.35,
                          fill: LEVEL_COLORS[Math.min(level + 1, 4)],
                        }
                      : {}
                  }
                  onClick={() => {
                    if (cell.count === 0) return;
                    setSelectedDate(
                      cell.dateKey === selectedDate ? null : cell.dateKey,
                    );
                  }}
                  aria-label={
                    cell.count > 0
                      ? `${cell.dateKey}: ${cell.count} 条日志`
                      : cell.dateKey
                  }
                />
              );
            }),
          )}
        </svg>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-2 justify-end text-xs text-genshin-light/40">
        <span>少</span>
        {LEVEL_COLORS.map((color, i) => (
          <span
            key={i}
            style={{
              background: color,
              border: "1px solid rgba(212,175,112,0.15)",
            }}
            className="inline-block w-3 h-3 rounded-sm"
          />
        ))}
        <span>多</span>
      </div>

      {/* ── Selected day entries ── */}
      {/* relative 容器让 popLayout 模式下退出元素 absolute 定位不溢出 */}
      <div className="relative">
        <AnimatePresence mode="popLayout">
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="border-t border-genshin-gold/20 pt-4"
            >
              <p className="text-xs text-genshin-light/50 mb-2 tracking-wider">
                {selectedDate}
                <span className="ml-2 text-genshin-gold/60">
                  {selectedEntries.length} 条记录
                </span>
              </p>
              <ul className="flex flex-col gap-1.5">
                {selectedEntries.map((entry) => (
                  <li key={entry.slug}>
                    <a
                      href={`/daily-log/${entry.slug}`}
                      className="group flex items-center gap-2 text-sm text-genshin-light/80 hover:text-genshin-gold transition-colors duration-200"
                    >
                      <span
                        style={{ background: "rgba(212,175,112,0.55)" }}
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0
                                   group-hover:shadow-[0_0_6px_rgba(212,175,112,0.9)]
                                   transition-shadow duration-200"
                      />
                      {entry.title}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
