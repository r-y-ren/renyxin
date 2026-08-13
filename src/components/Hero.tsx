/**
 * src/components/Hero.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · 首屏英雄区
 *  - 问候语（按时段）+ 衬线大字标题逐字绽放（3D 翻转入场）
 *  - 打字机角色轮播（带闪烁光标）
 *  - 磁吸 CTA 按钮（framer-motion 弹簧跟随鼠标）
 *  - 数据统计数字滚动（IntersectionObserver 触发）
 *  - 立绘「传送门」：悬浮浮动 + 公转光环 + 鼠标视差旋转
 *  - 底部滚动指示
 */
import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

interface HeroProps {
  title: string;
  subtitle: string;
  intro: string;
  stats: { posts: number; achievements: number; skills: number; logs: number };
  links: { label: string; href: string }[];
  imageSrc: string;
  imageAlt?: string;
}

const ROLES = [
  "嵌入式开发 · 持续探索中",
  "Python · 数据与建模",
  "AI 工程 · 实践者",
  "白日梦想家 ✦",
];

const easeOut = [0.22, 1, 0.36, 1] as const;

/** 打字机效果 */
function useTypewriter(roles: string[]) {
  const [text, setText] = useState("");
  const [ri, setRi] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = roles[ri % roles.length];
    let delay = deleting ? 38 : 88;
    if (!deleting && text === current) delay = 1900;

    const timer = window.setTimeout(() => {
      if (!deleting) {
        if (text === current) {
          setDeleting(true);
        } else {
          setText(current.slice(0, text.length + 1));
        }
      } else if (text === "") {
        setDeleting(false);
        setRi((i) => i + 1);
      } else {
        setText(current.slice(0, text.length - 1));
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [text, deleting, ri, roles]);

  return text;
}

/** 数字滚动计数 */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 1350;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * value));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

/** 磁吸包裹 */
function Magnetic({
  children,
  strength = 0.28,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 240, damping: 16 });
  const sy = useSpring(y, { stiffness: 240, damping: 16 });

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      className="inline-block"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export default function Hero({
  title,
  subtitle,
  intro,
  stats,
  links,
  imageSrc,
  imageAlt = "角色立绘",
}: HeroProps) {
  // 时段问候
  const hour = new Date().getHours();
  const greet =
    hour < 5
      ? "夜深了，还在看星星吗"
      : hour < 9
        ? "早上好，新的一天开始了"
        : hour < 12
          ? "上午好，元气满满"
          : hour < 14
            ? "中午好，记得吃饭"
            : hour < 18
              ? "下午好，继续加油"
              : hour < 23
                ? "晚上好，星光正好"
                : "夜深了，还在看星星吗";

  const typed = useTypewriter(ROLES);
  const letters = Array.from(title);

  // 立绘视差
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), {
    stiffness: 120,
    damping: 16,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), {
    stiffness: 120,
    damping: 16,
  });

  return (
    <div className="grid lg:grid-cols-[1.04fr_0.96fr] gap-14 lg:gap-8 items-center min-h-[100svh] pt-32 pb-16 lg:pt-24">
      {/* ── 左：文案 ── */}
      <div>
        <motion.p
          className="hero-kicker mb-7"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          {greet} ✦
        </motion.p>

        {/* 标题逐字绽放 */}
        <motion.h1
          className="hero-title text-[clamp(2.9rem,8vw,5.4rem)] mb-5"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.085, delayChildren: 0.15 } },
          }}
          aria-label={title}
        >
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              className={ch === " " ? "" : "grad inline-block"}
              variants={{
                hidden: { opacity: 0, y: 44, rotateX: 90 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotateX: 0,
                  transition: { duration: 0.85, ease: easeOut },
                },
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          ))}
        </motion.h1>

        {/* 打字机角色 */}
        <motion.div
          className="flex items-center gap-3 text-lg md:text-xl text-genshin-cyan mb-6 font-medium tracking-wider"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.75, ease: easeOut }}
        >
          <span className="w-2 h-2 rounded-full bg-genshin-cyan shadow-[0_0_12px_rgba(138,219,232,0.9)] inline-block" />
          <span>{typed}</span>
          <span className="hero-caret" aria-hidden="true" />
        </motion.div>

        {/* 简介 */}
        <motion.p
          className="text-genshin-light/65 leading-relaxed max-w-xl mb-4 text-[15px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: easeOut }}
        >
          {intro}
        </motion.p>
        <motion.p
          className="text-muted text-sm mb-9 tracking-wide"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.02, ease: easeOut }}
        >
          {subtitle}
        </motion.p>

        {/* CTA + 社交 */}
        <motion.div
          className="flex flex-wrap items-center gap-4 mb-12"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.15, ease: easeOut }}
        >
          <Magnetic>
            <a href="#about" className="btn btn-gold" data-cursor>
              关于我
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </Magnetic>
          <Magnetic strength={0.2}>
            <a href="#blog" className="btn btn-ghost" data-cursor>
              浏览文章
            </a>
          </Magnetic>
          {links.slice(0, 2).map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-genshin-gold transition-colors duration-300 tracking-widest underline-offset-4 hover:underline"
              data-cursor
            >
              {link.label} ↗
            </a>
          ))}
        </motion.div>

        {/* 统计 */}
        <motion.div
          className="grid grid-cols-4 gap-6 max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.3, ease: easeOut }}
        >
          {[
            { label: "文章", value: stats.posts },
            { label: "成就", value: stats.achievements },
            { label: "技能", value: stats.skills },
            { label: "日志", value: stats.logs },
          ].map((s) => (
            <div key={s.label}>
              <div className="stat-num text-gold-grad">
                <CountUp value={s.value} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── 右：立绘传送门 ── */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.86, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.1, delay: 0.5, ease: easeOut }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
      >
        <motion.div
          className="portal"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          <div className="portal-glow" aria-hidden="true" />
          <div className="portal-orbit inset-[7%]" aria-hidden="true" />
          <div className="portal-orbit reverse inset-[15%]" aria-hidden="true" />
          <div className="portal-img">
            <img src={imageSrc} alt={imageAlt} draggable={false} />
          </div>

          {/* 漂浮信息 chips */}
          <motion.div
            className="portal-chip"
            style={{ left: "-6%", top: "16%" }}
            animate={{ y: [0, -9, 0] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-genshin-cyan shadow-[0_0_8px_rgba(138,219,232,0.9)]" />
            CS · 大三
          </motion.div>
          <motion.div
            className="portal-chip"
            style={{ right: "-4%", bottom: "22%" }}
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          >
            <span className="text-genshin-gold">✦</span>
            目标：国家电网
          </motion.div>

          {/* 点缀星点 */}
          {[
            { l: "18%", t: "6%", d: 0 },
            { l: "78%", t: "10%", d: 1.1 },
            { l: "8%", t: "62%", d: 0.5 },
            { l: "88%", t: "58%", d: 1.7 },
            { l: "52%", t: "94%", d: 0.9 },
          ].map((dot, i) => (
            <motion.span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-genshin-gold"
              style={{ left: dot.l, top: dot.t }}
              animate={{ opacity: [0.15, 0.95, 0.15], scale: [0.7, 1.25, 0.7] }}
              transition={{
                duration: 2.6 + i * 0.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: dot.d,
              }}
              aria-hidden="true"
            />
          ))}
        </motion.div>
      </motion.div>

      {/* ── 滚动指示 ── */}
      <motion.a
        href="#about"
        className="absolute left-1/2 -translate-x-1/2 bottom-6 hidden md:flex flex-col items-center gap-2 text-muted hover:text-genshin-gold transition-colors duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        aria-label="向下滚动"
      >
        <span className="text-[11px] tracking-[0.3em]">SCROLL</span>
        <span className="scroll-cue" />
      </motion.a>
    </div>
  );
}
