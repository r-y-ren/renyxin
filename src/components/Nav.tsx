/**
 * src/components/Nav.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · 悬浮胶囊导航
 *  - 桌面：顶部居中的玻璃胶囊，滚动后变紧凑；当前章节高亮（scrollspy）
 *  - 悬停：导航文字"乱码解密"特效（ScrambleText）
 *  - 移动：右上角汉堡按钮 + 全屏衬线菜单（AnimatePresence 过渡）
 */
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface NavItem {
  id: string;
  label: string;
  num?: number;
}

interface NavProps {
  items: NavItem[];
}

const SCRAMBLE_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789#$%";

/** 悬停时文字乱码解密 */
function ScrambleText({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const timerRef = useRef<number | null>(null);

  const stop = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplay(text);
  };

  const start = () => {
    if (timerRef.current !== null) return;
    let frame = 0;
    const total = 12;
    timerRef.current = window.setInterval(() => {
      frame += 1;
      const revealed = Math.floor((frame / total) * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        out += i < revealed ? text[i] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
      setDisplay(out);
      if (frame >= total) stop();
    }, 42);
  };

  useEffect(() => stop, []);

  return (
    <span onMouseEnter={start} onMouseLeave={stop}>
      {display}
    </span>
  );
}

export default function Nav({ items }: NavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  // scrollspy + 紧凑态
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 44);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) setActive(en.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((s) => io.observe(s));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [items]);

  // 移动菜单打开时锁定滚动
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── 桌面胶囊导航 ── */}
      <nav
        className={`site-nav ${compact ? "is-compact" : ""}`}
        aria-label="主导航"
      >
        <div className="site-nav-pill">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`site-nav-item ${active === item.id ? "is-active" : ""}`}
            >
              <ScrambleText text={item.label} />
              {item.num !== undefined && (
                <span className="site-nav-num">{item.num}</span>
              )}
            </a>
          ))}
        </div>
      </nav>

      {/* ── 移动端汉堡按钮 ── */}
      <button
        className="nav-burger"
        aria-label={open ? "关闭菜单" : "打开菜单"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        )}
      </button>

      {/* ── 移动端全屏菜单 ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="site-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {items.map((item, i) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                className={`site-menu-link ${active === item.id ? "is-active" : ""}`}
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ delay: 0.06 + i * 0.055, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => go(item.id)}
              >
                {item.label}
                {item.num !== undefined && <span className="site-menu-num">{item.num}</span>}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
