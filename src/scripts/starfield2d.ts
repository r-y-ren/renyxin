/**
 * src/scripts/starfield2d.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * 星穹档案 · Canvas 2D 星野（降级路径）
 *   用于 WebGL 不可用 / prefers-reduced-motion 的场景：
 *   三层景深星场 + 星芒 + 鼠标/滚动视差 + 发光流星；
 *   静态模式（减弱动效）只绘制一帧。
 *   window.__meteorShower 彩蛋契约与 3D 版一致。
 */

interface BgStar {
  x: number;
  y: number;
  r: number;
  a: number;
  tw: number;
  ph: number;
  depth: number;
  tint: string;
  glint: boolean;
}
interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  cyan: boolean;
}

const TINTS = ['226, 232, 255', '186, 204, 255', '240, 228, 196'];

export function initStarfield2D(canvas: HTMLCanvasElement, staticMode: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let W = 0;
  let H = 0;
  let stars: BgStar[] = [];
  let meteors: Meteor[] = [];
  let nextMeteor = 3 + Math.random() * 5;

  // 彩蛋：页脚星星连点 10 次 / 游戏破纪录 → 全屏流星雨
  (window as unknown as { __meteorShower?: () => void }).__meteorShower = () => {
    for (let i = 0; i < 40; i++) {
      window.setTimeout(() => {
        meteors.push({
          x: Math.random() * W * 0.8 + W * 0.1,
          y: Math.random() * H * 0.3,
          vx: -(3 + Math.random() * 4),
          vy: 1.8 + Math.random() * 2.4,
          life: 0,
          max: 62 + Math.random() * 50,
          cyan: Math.random() < 0.3,
        });
      }, i * 100);
    }
  };

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  const initStars = () => {
    const count = Math.min(240, Math.floor((W * H) / 6400));
    stars = Array.from({ length: count }, () => {
      const depth = 0.3 + Math.random() * 0.7;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + Math.random() * 1.25 * depth,
        a: 0.2 + Math.random() * 0.65,
        tw: 0.6 + Math.random() * 2.4,
        ph: Math.random() * Math.PI * 2,
        depth,
        tint: TINTS[Math.floor(Math.random() * TINTS.length)],
        glint: Math.random() < 0.12 && depth > 0.75,
      };
    });
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
  };

  let t = 0;
  const draw = () => {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    const scrollDrift = (window.scrollY || 0) * 0.028;

    // 星辰（鼠标 + 滚动双视差，按景深分层）
    for (const s of stars) {
      const alpha = s.a * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph));
      const px = (((s.x + (mouse.x - W / 2) * 0.02 * s.depth) % W) + W) % W;
      const py =
        (((s.y + scrollDrift * s.depth + (mouse.y - H / 2) * 0.02 * s.depth) % H) + H) % H;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.tint}, ${alpha.toFixed(3)})`;
      ctx.fill();

      // 大星的四芒星辉（缓慢旋转）
      if (s.glint) {
        const gl = s.r * 4.2 * (0.6 + 0.4 * Math.sin(t * s.tw + s.ph));
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(t * 0.22 + s.ph);
        ctx.strokeStyle = `rgba(${s.tint}, ${(alpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(-gl, 0);
        ctx.lineTo(gl, 0);
        ctx.moveTo(0, -gl);
        ctx.lineTo(0, gl);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 流星（渐隐尾迹 + 发光头部，偶尔青色）
    if (t > nextMeteor && meteors.length < 2) {
      meteors.push({
        x: Math.random() * W * 0.7 + W * 0.15,
        y: Math.random() * H * 0.3,
        vx: -(3 + Math.random() * 3.4),
        vy: 1.6 + Math.random() * 1.8,
        life: 0,
        max: 60 + Math.random() * 40,
        cyan: Math.random() < 0.25,
      });
      nextMeteor = t + 6 + Math.random() * 8;
    }
    meteors = meteors.filter((m) => m.life < m.max);
    for (const m of meteors) {
      m.life += 1;
      m.x += m.vx;
      m.y += m.vy;
      const fade = 1 - m.life / m.max;
      const rgb = m.cyan ? '168, 226, 238' : '244, 236, 214';
      const tail = 16;
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
      grad.addColorStop(0, `rgba(${rgb}, ${(0.85 * fade).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
      ctx.stroke();
      // 发光头部
      const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 7);
      head.addColorStop(0, `rgba(${rgb}, ${(0.8 * fade).toFixed(3)})`);
      head.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  window.addEventListener('resize', resize);
  if (!staticMode) {
    window.addEventListener(
      'mousemove',
      (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      },
      { passive: true },
    );
    const frame = () => {
      draw();
      requestAnimationFrame(frame);
    };
    resize();
    requestAnimationFrame(frame);
  } else {
    resize();
    draw();
  }
}
