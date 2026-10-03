/**
 * src/components/StarGame.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · 彩蛋小游戏「星尘挑战 STARDUST RUN」
 *   - 玩法：驾驶月牙舟接住坠落的星星（金星 +10 / 青星 +25 / 彗星 +100 & +4s），
 *     躲开暗星（连击清零 & 扣分）；60 秒限时，连击倍率最高 ×8
 *   - 引擎：单 canvas 2D，rAF 主循环 + dt 钳制（切后台自动「冻结」）；
 *     星星/粒子/漂浮分数全程序化绘制，立绘贴图带兜底
 *   - HUD 走 DOM 引用直写（避免 60fps React 重渲染），界面态用 React 管理
 *   - 音效：src/scripts/sfx.ts 合成音（随连击升调）；破纪录触发流星雨彩蛋
 *   - 入口：Hero CTA / 右下角 FAB → window.__openStarGame 或 star-game:open 事件
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '../scripts/sfx';

interface StarGameProps {
  characterSrc?: string;
}

type Screen = 'start' | 'playing' | 'over';
type ItemKind = 'star' | 'cyan' | 'comet' | 'bomb';

interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  ring: boolean;
}

interface Pop {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

const GAME_TIME = 60;
const BEST_KEY = 'star-game-best';

const COLORS = {
  gold: '#e6c98f',
  goldLight: '#f7efdd',
  cyan: '#8adbe8',
  violet: '#9d8cf8',
  danger: '#e86f6f',
};

/** 五角星路径 */
function starPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  R: number,
  rot: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.46;
    const a = rot + (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** 预渲染径向光晕贴图（避免逐帧 shadowBlur） */
function makeGlow(color: string): HTMLCanvasElement {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function StarGame({ characterSrc }: StarGameProps) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('start');
  const [best, setBest] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [newRecord, setNewRecord] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const timeBarRef = useRef<HTMLDivElement>(null);
  const timeNumRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<Screen>('start');

  const spriteRef = useRef<HTMLImageElement | null>(null);
  const glowsRef = useRef<{ gold: HTMLCanvasElement; cyan: HTMLCanvasElement; red: HTMLCanvasElement } | null>(null);
  const keysRef = useRef({ left: false, right: false });

  // 可变游戏状态（放进 ref，主循环内零 React 开销）
  const G = useRef({
    W: 800,
    H: 460,
    t: 0,
    elapsed: 0,
    timeLeft: GAME_TIME,
    score: 0,
    combo: 0,
    bestCombo: 0,
    boatX: 400,
    targetX: 400,
    boatY: 380,
    spawnTimer: 0.6,
    shake: 0,
    items: [] as Item[],
    particles: [] as Particle[],
    pops: [] as Pop[],
    bgStars: [] as { x: number; y: number; r: number; a: number; s: number }[],
    raf: 0,
    last: 0,
  });

  // ── 初始化：best / 贴图 / 光晕 ────────────────────────────────────────────
  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY) || 0) || 0);
    } catch {
      /* localStorage 不可用则静默 */
    }
    if (!glowsRef.current) {
      glowsRef.current = {
        gold: makeGlow('rgba(230, 201, 143, 0.55)'),
        cyan: makeGlow('rgba(138, 219, 232, 0.5)'),
        red: makeGlow('rgba(232, 111, 111, 0.55)'),
      };
    }
    if (!spriteRef.current && characterSrc) {
      const img = new Image();
      img.src = characterSrc;
      img.onload = () => {
        spriteRef.current = img;
      };
      // 贴图失败 → 保持 null，绘制层走纯月牙舟兜底
    }
  }, [characterSrc]);

  // ── 对外挂钩：window.__openStarGame + star-game:open 事件 ─────────────────
  const openGame = useCallback(() => {
    sfx.unlock();
    sfx.pop();
    setOpen(true);
    setScreen('start');
    screenRef.current = 'start';
    setNewRecord(false);
    setFinalScore(0);
  }, []);

  useEffect(() => {
    (window as unknown as { __openStarGame?: () => void }).__openStarGame = openGame;
    const onOpen = () => openGame();
    document.addEventListener('star-game:open', onOpen);
    return () => {
      document.removeEventListener('star-game:open', onOpen);
    };
  }, [openGame]);

  // ── 开局 / 重开 ───────────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    const g = G.current;
    g.elapsed = 0;
    g.timeLeft = GAME_TIME;
    g.score = 0;
    g.combo = 0;
    g.bestCombo = 0;
    g.spawnTimer = 0.55;
    g.shake = 0;
    g.items = [];
    g.particles = [];
    g.pops = [];
    g.boatX = g.W / 2;
    g.targetX = g.W / 2;
    // HUD 复位
    if (scoreRef.current) scoreRef.current.textContent = '0';
    if (comboRef.current) {
      comboRef.current.textContent = '×1 · 0 连';
      comboRef.current.classList.remove('is-on', 'is-hot');
    }
    if (timeNumRef.current) timeNumRef.current.textContent = String(GAME_TIME);
    if (timeBarRef.current) timeBarRef.current.style.width = '100%';
    setScreen('playing');
    screenRef.current = 'playing';
    sfx.unlock();
    sfx.start();
  }, []);

  // ── 主循环 ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = G.current;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // offsetWidth/Height 不受入场动画 transform 缩放影响
      const w = wrap.offsetWidth || wrap.clientWidth;
      const h = wrap.offsetHeight || wrap.clientHeight;
      if (w < 2 || h < 2) return;
      g.W = w;
      g.H = h;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.boatY = g.H - 72;
      if (g.bgStars.length === 0) {
        g.bgStars = Array.from({ length: 64 }, () => ({
          x: Math.random() * g.W,
          y: Math.random() * g.H,
          r: 0.5 + Math.random() * 1.5,
          a: 0.15 + Math.random() * 0.5,
          s: 6 + Math.random() * 18,
        }));
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // ── 生成掉落物 ─────────────────────────────────────────────────────────
    const spawn = () => {
      const p = Math.random();
      const kind: ItemKind =
        p < 0.56 ? 'star' : p < 0.78 ? 'cyan' : p < 0.87 ? 'comet' : 'bomb';
      const speedBase = 165 + Math.random() * 70 + g.elapsed * 2.6;
      g.items.push({
        kind,
        x: 46 + Math.random() * Math.max(1, g.W - 92),
        y: -30,
        vx: (Math.random() - 0.5) * (kind === 'comet' ? 46 : 16),
        vy:
          speedBase *
          (kind === 'comet' ? 1.6 : kind === 'bomb' ? 1.12 : 1),
        r: kind === 'comet' ? 15 : kind === 'bomb' ? 16 : 12 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.4,
      });
    };

    // ── 粒子 / 漂浮分数 ────────────────────────────────────────────────────
    const burst = (
      x: number,
      y: number,
      color: string,
      n: number,
      power = 1,
      ring = false,
    ) => {
      const cap = g.particles.length < 260;
      if (!cap) return;
      const count = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? Math.ceil(n / 2)
        : n;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (60 + Math.random() * 190) * power;
        g.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30 * power,
          life: 0,
          max: 0.4 + Math.random() * 0.5,
          size: 1.6 + Math.random() * 2.6,
          color,
          ring: false,
        });
      }
      if (ring) {
        g.particles.push({
          x,
          y,
          vx: 0,
          vy: 0,
          life: 0,
          max: 0.42,
          size: 8,
          color,
          ring: true,
        });
      }
    };

    const pop = (x: number, y: number, text: string, color: string, size = 17) => {
      g.pops.push({ x, y, vy: -52, life: 0, max: 0.95, text, color, size });
    };

    // ── 接取判定 ───────────────────────────────────────────────────────────
    const mult = () => 1 + Math.min(7, Math.floor(g.combo / 4));

    const catchItem = (it: Item) => {
      const m = mult();
      if (it.kind === 'bomb') {
        g.combo = 0;
        g.score = Math.max(0, g.score - 30);
        g.shake = 13;
        burst(it.x, it.y, COLORS.danger, 18, 1.25, true);
        pop(it.x, it.y, '−30', COLORS.danger, 19);
        sfx.bomb();
        if (flashRef.current) {
          flashRef.current.style.opacity = '1';
          window.setTimeout(() => {
            if (flashRef.current) flashRef.current.style.opacity = '0';
          }, 90);
        }
      } else if (it.kind === 'comet') {
        g.combo += 1;
        g.bestCombo = Math.max(g.bestCombo, g.combo);
        const pts = 100 * m;
        g.score += pts;
        g.timeLeft = Math.min(GAME_TIME + 16, g.timeLeft + 4);
        burst(it.x, it.y, COLORS.gold, 24, 1.4, true);
        burst(it.x, it.y, COLORS.cyan, 10, 1);
        pop(it.x, it.y, `+${pts}  +4s`, COLORS.goldLight, 19);
        sfx.comet();
      } else {
        g.combo += 1;
        g.bestCombo = Math.max(g.bestCombo, g.combo);
        const base = it.kind === 'cyan' ? 25 : 10;
        const pts = base * m;
        g.score += pts;
        const color = it.kind === 'cyan' ? COLORS.cyan : COLORS.gold;
        burst(it.x, it.y, color, 12, 1, true);
        pop(
          it.x,
          it.y,
          m > 1 ? `+${pts} ×${m}` : `+${pts}`,
          it.kind === 'cyan' ? COLORS.cyan : COLORS.goldLight,
          m > 3 ? 19 : 16,
        );
        sfx.star(g.combo);
      }
      // HUD 即时反馈
      if (scoreRef.current) scoreRef.current.textContent = String(g.score);
      if (comboRef.current) {
        comboRef.current.textContent = `×${mult()} · ${g.combo} 连`;
        comboRef.current.classList.toggle('is-hot', g.combo >= 12);
        comboRef.current.classList.toggle('is-on', g.combo >= 2);
      }
    };

    // ── 游戏结束 ───────────────────────────────────────────────────────────
    const endRun = () => {
      setScreen('over');
      screenRef.current = 'over';
      setFinalScore(g.score);
      let bestVal = best;
      try {
        bestVal = Number(localStorage.getItem(BEST_KEY) || 0) || 0;
      } catch {
        /* ignore */
      }
      const isRecord = g.score > bestVal;
      setNewRecord(isRecord);
      if (isRecord) {
        bestVal = g.score;
        try {
          localStorage.setItem(BEST_KEY, String(g.score));
        } catch {
          /* ignore */
        }
        setBest(g.score);
        sfx.record();
        // 破纪录 → 全屏流星雨 + toast（index.astro 挂钩）
        (window as unknown as { __meteorShower?: () => void }).__meteorShower?.();
        const eggToast = (window as unknown as { __eggToast?: (m: string) => void })
          .__eggToast;
        eggToast?.('✦ 新纪录！星雨为你而落 ✦');
      } else {
        sfx.over();
      }
    };

    // ── 更新 ───────────────────────────────────────────────────────────────
    const update = (dt: number) => {
      const playing = screenRef.current === 'playing';
      g.t += dt;
      if (playing) {
        g.elapsed += dt;
        g.timeLeft -= dt;
        if (g.timeLeft <= 0) {
          g.timeLeft = 0;
          endRun();
        }

        // 小船移动：键盘 + 指针追踪
        const keys = keysRef.current;
        if (keys.left || keys.right) {
          g.targetX += ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * 660 * dt;
        }
        g.targetX = Math.max(64, Math.min(g.W - 64, g.targetX));
        g.boatX += (g.targetX - g.boatX) * Math.min(1, dt * 11);

        // 生成
        g.spawnTimer -= dt;
        if (g.spawnTimer <= 0) {
          g.spawnTimer =
            Math.max(0.3, 0.84 - g.elapsed * 0.0075) * (0.82 + Math.random() * 0.5);
          spawn();
        }

        // 掉落物移动 + 判定
        const halfW = 58;
        g.items = g.items.filter((it) => {
          it.y += it.vy * dt;
          it.x += it.vx * dt;
          it.rot += it.spin * dt;
          const dx = it.x - g.boatX;
          const dy = it.y - g.boatY;
          if (Math.abs(dx) < halfW && dy > -36 && dy < 28) {
            catchItem(it);
            return false;
          }
          if (it.y > g.H + 46) return false;
          return true;
        });

        // 彗星拖尾
        for (const it of g.items) {
          if (it.kind === 'comet' && g.particles.length < 240) {
            g.particles.push({
              x: it.x + (Math.random() - 0.5) * 8,
              y: it.y - 12,
              vx: (Math.random() - 0.5) * 20,
              vy: -30 - Math.random() * 30,
              life: 0,
              max: 0.35 + Math.random() * 0.25,
              size: 1.4 + Math.random() * 1.8,
              color: Math.random() > 0.5 ? COLORS.gold : COLORS.cyan,
              ring: false,
            });
          }
        }

        // HUD
        const ratio = Math.max(0, Math.min(1, g.timeLeft / GAME_TIME));
        if (timeBarRef.current) timeBarRef.current.style.width = `${ratio * 100}%`;
        if (timeNumRef.current) {
          timeNumRef.current.textContent = String(Math.ceil(g.timeLeft));
        }
      }

      // 粒子
      g.particles = g.particles.filter((p) => {
        p.life += dt;
        if (p.life >= p.max) return false;
        if (!p.ring) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 220 * dt;
        }
        return true;
      });
      // 漂浮分数
      g.pops = g.pops.filter((p) => {
        p.life += dt;
        if (p.life >= p.max) return false;
        p.y += p.vy * dt;
        p.vy *= 0.97;
        return true;
      });
      g.shake *= Math.exp(-dt * 7);
    };

    // ── 绘制 ───────────────────────────────────────────────────────────────
    const drawStar = (
      x: number,
      y: number,
      r: number,
      rot: number,
      color: string,
      glow: HTMLCanvasElement,
      glowSize: number,
    ) => {
      ctx.drawImage(glow, x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
      starPath(ctx, x, y, r, rot);
      const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
      grad.addColorStop(0, COLORS.goldLight);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    };

    const draw = () => {
      const { W, H } = g;
      ctx.clearRect(0, 0, W, H);

      // 背景渐变
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b1326');
      bg.addColorStop(1, '#070c18');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      // 星云光斑
      const neb = ctx.createRadialGradient(W * 0.22, H * 0.18, 0, W * 0.22, H * 0.18, W * 0.5);
      neb.addColorStop(0, 'rgba(96, 110, 190, 0.16)');
      neb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      // 屏幕震动
      if (g.shake > 0.4) {
        ctx.translate(
          (Math.random() - 0.5) * g.shake,
          (Math.random() - 0.5) * g.shake,
        );
      }

      // 背景星尘（缓慢下沉）
      for (const s of g.bgStars) {
        const yy = (s.y + g.t * s.s) % H;
        ctx.globalAlpha = s.a * (0.55 + 0.45 * Math.sin(g.t * 1.4 + s.x));
        ctx.fillStyle = '#dfe6ff';
        ctx.beginPath();
        ctx.arc(s.x, yy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const glows = glowsRef.current;
      if (glows) {
        // 掉落物
        for (const it of g.items) {
          if (it.kind === 'bomb') {
            ctx.drawImage(glows.red, it.x - 46, it.y - 46, 92, 92);
            const grad = ctx.createRadialGradient(
              it.x - it.r * 0.35,
              it.y - it.r * 0.4,
              it.r * 0.15,
              it.x,
              it.y,
              it.r,
            );
            grad.addColorStop(0, '#4c2430');
            grad.addColorStop(1, '#12060c');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(232, 111, 111, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.stroke();
            // 内部裂纹
            ctx.beginPath();
            ctx.moveTo(it.x - it.r * 0.5, it.y - it.r * 0.2);
            ctx.lineTo(it.x + it.r * 0.15, it.y + it.r * 0.35);
            ctx.lineTo(it.x + it.r * 0.55, it.y - it.r * 0.3);
            ctx.strokeStyle = 'rgba(232, 111, 111, 0.5)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (it.kind === 'comet') {
            // 彗尾
            const tail = ctx.createLinearGradient(it.x, it.y, it.x - it.vx * 6, it.y - 42);
            tail.addColorStop(0, 'rgba(230, 201, 143, 0.5)');
            tail.addColorStop(1, 'rgba(230, 201, 143, 0)');
            ctx.fillStyle = tail;
            ctx.beginPath();
            ctx.moveTo(it.x - 10, it.y);
            ctx.lineTo(it.x + 10, it.y);
            ctx.lineTo(it.x - it.vx * 5, it.y - 52);
            ctx.closePath();
            ctx.fill();
            drawStar(it.x, it.y, it.r, it.rot, COLORS.gold, glows.gold, 110);
          } else {
            const isCyan = it.kind === 'cyan';
            drawStar(
              it.x,
              it.y,
              it.r,
              it.rot,
              isCyan ? COLORS.cyan : COLORS.gold,
              isCyan ? glows.cyan : glows.gold,
              74,
            );
          }
        }
      }

      // 粒子
      for (const p of g.particles) {
        const k = 1 - p.life / p.max;
        if (p.ring) {
          ctx.globalAlpha = k * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2 * k + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + (1 - k) * 34, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * k + 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 月牙舟 + 立绘
      const bob = Math.sin(g.t * 2.1) * 3;
      const tilt = Math.max(-0.22, Math.min(0.22, (g.targetX - g.boatX) * 0.004));
      ctx.save();
      ctx.translate(g.boatX, g.boatY + bob);
      ctx.rotate(tilt);
      if (glows) {
        ctx.globalAlpha = 0.65;
        ctx.drawImage(glows.gold, -92, -64, 184, 130);
        ctx.globalAlpha = 1;
      }
      // 接取区提示弧
      ctx.beginPath();
      ctx.arc(0, -6, 58, Math.PI * 1.12, Math.PI * 1.88);
      ctx.strokeStyle = 'rgba(138, 219, 232, 0.4)';
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);
      // 月牙
      const R = 54;
      const moonGrad = ctx.createLinearGradient(0, -R, 0, R * 0.9);
      moonGrad.addColorStop(0, '#f7efdd');
      moonGrad.addColorStop(1, '#b8936d');
      ctx.beginPath();
      ctx.arc(0, 0, R, Math.PI * 0.12, Math.PI * 0.88);
      ctx.arc(0, -30, R, Math.PI * 0.88, Math.PI * 0.12, true);
      ctx.closePath();
      ctx.fillStyle = moonGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 244, 222, 0.5)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // 立绘（失败则只保留月牙舟）
      const sprite = spriteRef.current;
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const h = 86;
        const w = (h * sprite.naturalWidth) / sprite.naturalHeight;
        ctx.drawImage(sprite, -w / 2, -h - 16, w, h);
      }
      ctx.restore();

      // 漂浮分数
      for (const p of g.pops) {
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = p.color;
        ctx.font = `700 ${p.size}px "LXGW WenKai", "Noto Serif SC", serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ── rAF 帧调度（dt 钳制：切后台回来不跳帧）──────────────────────────────
    const frame = (now: number) => {
      const g2 = G.current;
      if (!g2.last) g2.last = now;
      const dt = Math.min(0.05, (now - g2.last) / 1000);
      g2.last = now;
      if (open) {
        update(dt);
        draw();
      }
      g2.raf = requestAnimationFrame(frame);
    };
    G.current.raf = requestAnimationFrame(frame);

    // ── 指针操控 ───────────────────────────────────────────────────────────
    const toLocalX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || 1;
      return ((clientX - rect.left) / w) * g.W;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (screenRef.current !== 'playing') return;
      g.targetX = toLocalX(e.clientX);
    };
    const onPointerDown = (e: PointerEvent) => {
      sfx.unlock();
      if (screenRef.current !== 'playing') return;
      g.targetX = toLocalX(e.clientX);
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);

    return () => {
      cancelAnimationFrame(G.current.raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, best]);

  // ── 键盘：方向键移动 / 空格开始与重开 / Esc 关闭 ─────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        keysRef.current.left = e.type === 'keydown';
        e.preventDefault();
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        keysRef.current.right = e.type === 'keydown';
        e.preventDefault();
      }
      if (e.type === 'keydown' && (e.key === ' ' || e.key === 'Enter')) {
        if (screenRef.current !== 'playing') {
          e.preventDefault();
          startRun();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [open, startRun]);

  // ── 弹窗打开：锁定背景滚动 ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    sfx.click();
  };

  return (
    <>
      {/* ── 开始 / 结束界面共用的浮层 ─────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[210]"
              onClick={() => {
                if (screenRef.current !== 'playing') close();
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed inset-0 z-[220] flex items-center justify-center p-3 pointer-events-none"
            >
              <div className="glass-panel star-game-panel pointer-events-auto relative">
                {/* 顶部：标题 + 最高分 + 关闭 */}
                <div className="game-head">
                  <div>
                    <h3 className="game-title">
                      星尘挑战 <span className="en">Stardust Run</span>
                    </h3>
                    <p className="game-sub">驾驶月牙舟，接住星星，躲开暗星 ✦</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="game-chip">
                      最高分 <b>{best}</b>
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={close}
                      className="game-close"
                      aria-label="关闭游戏"
                    >
                      ✕
                    </motion.button>
                  </div>
                </div>

                {/* 游戏画布区 */}
                <div className="game-canvas-wrap" ref={wrapRef}>
                  <canvas ref={canvasRef} />
                  <div className="game-flash" ref={flashRef} aria-hidden="true" />

                  {/* HUD */}
                  <div className="game-hud">
                    <div className="flex items-center gap-2.5">
                      <div className="game-chip score">
                        <span className="hud-label">SCORE</span>
                        <span ref={scoreRef} className="hud-value">
                          0
                        </span>
                      </div>
                      <div className="game-chip combo" ref={comboRef}>
                        ×1 · 0 连
                      </div>
                    </div>
                    <div className="game-chip time">
                      <span className="hud-label">TIME</span>
                      <span ref={timeNumRef} className="hud-value">
                        60
                      </span>
                      <div className="game-timebar">
                        <div ref={timeBarRef} />
                      </div>
                    </div>
                  </div>

                  {/* 开始界面 */}
                  <AnimatePresence>
                    {screen === 'start' && (
                      <motion.div
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="game-screen-overlay"
                      >
                        <div className="game-big-title">✦ 星尘挑战 ✦</div>
                        <p className="game-rules">
                          金星 <b className="text-gold">+10</b> · 青星{' '}
                          <b style={{ color: COLORS.cyan }}>+25</b> · 彗星{' '}
                          <b className="text-gold">+100 & +4s</b>
                          <br />
                          连击越快倍率越高（最高 ×8），暗星会清空连击！
                        </p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.96 }}
                          className="btn btn-gold"
                          onClick={startRun}
                        >
                          开始挑战
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </motion.button>
                        <p className="game-hint">
                          ← → / A D / 鼠标 · 触摸拖动控制月牙舟
                        </p>
                      </motion.div>
                    )}

                    {/* 结束界面 */}
                    {screen === 'over' && (
                      <motion.div
                        key="over"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="game-screen-overlay"
                      >
                        {newRecord ? (
                          <motion.div
                            initial={{ rotate: -8, scale: 0.6, opacity: 0 }}
                            animate={{ rotate: -8, scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                            className="game-record-badge"
                          >
                            NEW RECORD
                          </motion.div>
                        ) : (
                          <div className="game-big-title">时间到 ✦</div>
                        )}
                        <div className="game-final-score">{finalScore}</div>
                        <p className="game-rules">
                          最高连击 ×{Math.min(8, 1 + Math.floor(G.current.bestCombo / 4))} ·{' '}
                          {G.current.bestCombo} 连 · 最高分 {Math.max(best, finalScore)}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.96 }}
                            className="btn btn-gold"
                            onClick={startRun}
                          >
                            再来一局
                          </motion.button>
                          <button className="btn btn-ghost" onClick={close}>
                            先逛逛
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="game-foot">
                  接住坠落的星星累积连击倍率 · 彗星会送你额外时间 · 暗星会让你前功尽弃
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
