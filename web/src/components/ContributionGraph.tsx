import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyLogEntry {
  slug: string;
  date: string; // ISO date string "YYYY-MM-DD"
  title: string;
}

interface Props {
  logs: DailyLogEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const WEEKS = 53;
const DAYS_IN_WEEK = 7;

/** Genshin-themed contribution level colors (0 = empty → 4 = brightest gold) */
const LEVEL_COLORS = [
  "rgba(255,255,255,0.04)", // 0 – no entry
  "rgba(212,175,112,0.20)", // 1
  "rgba(212,175,112,0.45)", // 2
  "rgba(212,175,112,0.72)", // 3
  "rgba(212,175,112,1.00)", // 4+
];

const WEEKDAY_LABELS = ["一", "三", "五"];
const WEEKDAY_ROWS = [1, 3, 5]; // Mon(0-indexed) → display rows 1,3,5

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return "YYYY-MM-DD" for any Date */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Clamp count to a color level index (0–4) */
function countToLevel(n: number): number {
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContributionGraph({ logs }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Build date → entries map ──────────────────────────────────────────────
  const entryMap = useMemo(() => {
    const map = new Map<string, DailyLogEntry[]>();
    for (const log of logs) {
      const key = log.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  // ── Generate 53-week grid starting from last Sunday ───────────────────────
  const { grid, monthMarkers } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from the Sunday that is ~52 weeks before the current week's Sunday
    const dayOfWeek = today.getDay(); // 0=Sun
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek);

    const startDate = new Date(lastSunday);
    startDate.setDate(lastSunday.getDate() - (WEEKS - 1) * 7);

    // grid[week][day] = { dateKey, count }
    const grid: Array<
      Array<{ dateKey: string; count: number; isFuture: boolean }>
    > = [];
    const seenMonths = new Set<string>();
    const monthMarkers: Array<{ weekIndex: number; label: string }> = [];

    for (let w = 0; w < WEEKS; w++) {
      const week: Array<{ dateKey: string; count: number; isFuture: boolean }> =
        [];
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const key = toDateKey(date);
        const isFuture = date > today;
        week.push({
          dateKey: key,
          count: entryMap.get(key)?.length ?? 0,
          isFuture,
        });

        // Month label: mark first week where this month appears
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

  const selectedEntries = selectedDate
    ? (entryMap.get(selectedDate) ?? [])
    : [];

  const svgWidth = WEEKS * CELL_STEP - CELL_GAP + 24; // left margin for day labels
  const svgHeight = DAYS_IN_WEEK * CELL_STEP - CELL_GAP + 20; // top margin for month labels

  return (
    <div className="glass-panel flex flex-col gap-4 select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-widest text-genshin-gold">
          每日进程
        </h2>
        <span className="text-xs text-genshin-light/40">过去一年</span>
      </div>

      {/* ── Heatmap SVG ── */}
      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: "block", minWidth: svgWidth }}
          aria-label="贡献热力图"
        >
          {/* Month labels */}
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

          {/* Weekday labels (Mon / Wed / Fri) */}
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

          {/* Cells */}
          {grid.map((week, wi) =>
            week.map((cell, di) => {
              const isSelected = cell.dateKey === selectedDate;
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
