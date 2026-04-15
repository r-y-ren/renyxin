/**
 * src/components/DraggableCharacter.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * 可拖拽角色卡片组件 —— 最复杂的 React 组件，核心是 Canvas 文字绕排算法。
 *
 * 功能：
 *   1. 在指定宽度容器内，以 Canvas 测量字符宽度并执行自动换行
 *   2. 文字绕排角色立绘：根据角色图片的碰撞箱偏移量，计算每行可用槽位
 *   3. 角色图片可拖拽（Framer Motion drag + 弹性约束）
 *   4. 图片拖动时，文字布局实时重新计算（reflow）
 *   5. 响应容器尺寸变化（ResizeObserver），自适应宽度
 *
 * 数据来源：
 *   props.imageSrc     → heroEntry.data.characterImage（src/content/site-info/hero.md）
 *   props.imageAlt     → heroEntry.data.characterAlt（同上）
 *   props.markdownHtml → marked.parse(heroEntry.body)（由 index.astro 提前渲染）
 *   props.title        → heroEntry.data.title（同上）
 *
 * 消费方：src/pages/index.astro（第 1 块内容区，client:load 激活）
 *
 * 核心算法（buildGlyphProjection）：
 *   1. 将 HTML 转纯文本 → 分字素（grapheme）→ 通过 @chenglou/pretext 分段
 *   2. 逐行：调用 computeLineSlots() 计算碰撞箱遮挡后的可用区域
 *   3. 在每行槽位内用 layoutNextLineRange / materializeLineRange 排布字符
 *   4. 返回 PositionedGlyph[] 数组，由 Canvas drawText 按坐标绘制
 *
 * 碰撞箱（HITBOX_OFFSET_*）：
 *   相对图片物理边缘的偏移量，是文字绕排和拖拽约束的唯一事实来源。
 *   调整这4个常量可以修改文字与图片的间距。
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext"; // 用于文本分段和断行计算的库
import { motion, useMotionValue } from "framer-motion";

interface DraggableCharacterProps {
  imageSrc: string;
  imageAlt?: string;
  markdownHtml: string;
  title?: string;
}

// ==================== 布局常量 ====================
const CHARACTER_WIDTH = 250 * 1.85; // 角色图片宽度
const CHARACTER_HEIGHT = 360 * 1; // 角色图片高度
const BASE_LEFT = -70; // 图片初始左偏移
const BASE_TOP = 0; // 图片初始上偏移
const BODY_FONT_SIZE = 20; // 正文字体大小（像素）
const BODY_LINE_HEIGHT = 34; // 正文行高（像素）
const BODY_FONT = `${BODY_FONT_SIZE}px Georgia, "Times New Roman", serif`; // 字体描述
const BODY_TEXT_COLOR = "rgba(236, 229, 216, 0.92)"; // 正文颜色
const CANVAS_PADDING_X = 12; // 画布水平内边距
const CANVAS_PADDING_Y = 0; // 画布垂直内边距
const STAGE_MIN_HEIGHT = 560; // 舞台最小高度（未使用，保留备用）

// ── 虚拟碰撞箱偏移量（单一事实来源）──────────────────────────────────────
// 碰撞箱边缘相对于图片物理边缘的偏移量，同时驱动文字环绕排版与拖拽约束。
// 定义：
//   hitboxLeft   = imageX + HITBOX_OFFSET_L
//   hitboxRight  = imageX + CHARACTER_WIDTH  + HITBOX_OFFSET_R
//   hitboxTop    = imageY + HITBOX_OFFSET_T
//   hitboxBottom = imageY + CHARACTER_HEIGHT + HITBOX_OFFSET_B
const HITBOX_OFFSET_L = 80; // 左边界向内缩 90px（图片左侧透明区域不遮挡文字）
const HITBOX_OFFSET_R = -90; // 右边界向内缩 90px（同上，右侧透明区域）
const HITBOX_OFFSET_T = 30; // 顶边界向下偏移 38px（原 -OBSTACLE_PAD_Y + 100 = -62+100）
const HITBOX_OFFSET_B = 79; // 底边界向下延伸 72px

// ==================== 类型定义 ====================
type Size = {
  width: number;
  height: number;
};

/** 胶囊体障碍物（用于描述角色图片占据区域） */
type CapsuleObstacle = {
  x: number; // 障碍物左上角 X 坐标
  y: number; // 障碍物左上角 Y 坐标
  width: number; // 宽度
  height: number; // 高度
};

/** 一行中的可用槽位（文字可放置的水平区域） */
type LineSlot = {
  x: number; // 槽位起始 X
  width: number; // 槽位宽度
};

/** 定位后的字形（每个字符及其画布坐标） */
type PositionedGlyph = {
  char: string; // 字符
  x: number; // 绘制 X 坐标
  y: number; // 绘制 Y 坐标（基线）
};

type GlyphProjection = {
  glyphs: PositionedGlyph[];
  requiredHeight: number;
};

// ==================== 工具函数 ====================

/**
 * 解码 HTML 实体（如 &nbsp;、&lt; 等）
 * 在服务端环境下用正则替换，客户端用 textarea 解码
 */
function decodeEntities(value: string): string {
  if (typeof window === "undefined") {
    return value
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

/**
 * 将 Markdown 转换后的 HTML 粗略转换为纯文本
 * 处理常见块级标签（p, h1~h6, li 等）为换行
 */
function htmlToPlainText(html: string): string {
  const normalized = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<[^>]+>/g, " "); // 移除剩余标签

  return decodeEntities(normalized)
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n") // 压缩多余空行
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * 将字符串按字素（grapheme）分割，正确处理表情符号等组合字符
 * 优先使用 Intl.Segmenter，回退到 Array.from
 */
function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(text), (segment) => segment.segment);
  }

  return Array.from(text);
}

/** 判断两个布局游标是否相同 */
function sameCursor(left: LayoutCursor, right: LayoutCursor): boolean {
  return (
    left.segmentIndex === right.segmentIndex &&
    left.graphemeIndex === right.graphemeIndex
  );
}

/**
 * 计算给定文本行（由 lineTop 和 lineBottom 定义垂直范围）的水平可用槽位
 * 基于矩形障碍物（带内边距）与行的相交情况，返回左/右两侧可排文的区域。
 * 采用矩形而非胶囊体，避免顶/底圆弧处宽度收窄导致文字错误出现在角色顶部左侧的问题。
 */
function computeLineSlots(
  lineTop: number,
  lineBottom: number,
  innerWidth: number,
  obstacle: CapsuleObstacle,
): LineSlot[] {
  // 从图片物理边缘应用碰撞箱偏移量，得到排版绕排边界
  const expandedLeft = obstacle.x + HITBOX_OFFSET_L;
  const expandedRight = obstacle.x + obstacle.width + HITBOX_OFFSET_R;
  const expandedTop = obstacle.y + HITBOX_OFFSET_T;
  const expandedBottom = obstacle.y + obstacle.height + HITBOX_OFFSET_B;

  const intersects = lineBottom > expandedTop && lineTop < expandedBottom;

  // 若无交集，整行可用
  if (!intersects) {
    return [{ x: 0, width: innerWidth }];
  }

  // 矩形障碍物：左/右遮挡边界直接由扩展后的矩形决定
  const blockedLeft = Math.max(0, expandedLeft);
  const blockedRight = Math.min(innerWidth, expandedRight);

  const slots: LineSlot[] = [];

  // 左侧槽位：obstacle 左边与画布左边之间的区域
  // 若左边界落在画布左侧内且宽度足以排下至少 2 个字符才添加
  if (blockedLeft >= BODY_FONT_SIZE * 2) {
    slots.push({ x: 0, width: blockedLeft });
  }

  // 右侧槽位：obstacle 右边到画布右边的区域
  const rightWidth = Math.max(0, innerWidth - blockedRight);
  if (rightWidth >= BODY_FONT_SIZE * 2) {
    slots.push({ x: blockedRight, width: rightWidth });
  }

  // 若没有有效槽位，返回全宽兜底（极少发生，防止死循环）
  return slots.length > 0 ? slots : [{ x: 0, width: innerWidth }];
}

/**
 * 构建字形投影数组：根据容器尺寸、障碍物位置，计算所有字符的绘制坐标
 * 核心算法：
 * 1. 逐行遍历（根据行高递增）
 * 2. 对每行计算可用槽位
 * 3. 在每个槽位内调用 pretext 库的 layoutNextLineRange 获取能放入的字符范围
 * 4. 获取实际文本，按字素分割并累加每个字符的宽度，记录坐标
 * 5. 额外返回本次排版实际需要的总高度，用于驱动容器自适应
 */
function buildGlyphProjection(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedTextWithSegments,
  canvasSize: Size,
  obstacle: CapsuleObstacle,
): GlyphProjection {
  const innerWidth = Math.max(0, canvasSize.width - CANVAS_PADDING_X * 2);
  const baselineOffset = BODY_FONT_SIZE * 0.84; // 基线偏移经验值，使文字垂直居中
  const glyphs: PositionedGlyph[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
  let lastOccupiedBottom = CANVAS_PADDING_Y;

  for (let lineIndex = 0; lineIndex < 5000; lineIndex += 1) {
    const lineTop = lineIndex * BODY_LINE_HEIGHT;
    const lineBottom = lineTop + BODY_LINE_HEIGHT;
    const slots = computeLineSlots(lineTop, lineBottom, innerWidth, obstacle);
    let consumedOnBand = false; // 标记当前行是否至少排入了一些字符

    for (const slot of slots) {
      const range = layoutNextLineRange(prepared, cursor, slot.width);
      if (range === null) {
        return {
          glyphs,
          requiredHeight: Math.max(
            STAGE_MIN_HEIGHT,
            Math.ceil(lastOccupiedBottom + CANVAS_PADDING_Y),
          ),
        };
      }

      if (sameCursor(cursor, range.end)) {
        // 游标未前进，说明槽位宽度不足以容纳任何字符（可能是极端情况）
        continue;
      }

      const line = materializeLineRange(prepared, range);
      const graphemes = splitGraphemes(line.text);
      let currentX = CANVAS_PADDING_X + slot.x;
      const baselineY = CANVAS_PADDING_Y + lineTop + baselineOffset;

      for (const grapheme of graphemes) {
        glyphs.push({ char: grapheme, x: currentX, y: baselineY });
        currentX += ctx.measureText(grapheme).width;
      }

      cursor = range.end;
      consumedOnBand = true;
      lastOccupiedBottom = Math.max(
        lastOccupiedBottom,
        CANVAS_PADDING_Y + lineBottom,
      );
    }

    // 如果该行没有任何字符被消费，说明遇到了无法排版的极窄区域，直接跳过行（很少发生）
    if (!consumedOnBand) {
      continue;
    }
  }

  return {
    glyphs,
    requiredHeight: Math.max(
      STAGE_MIN_HEIGHT,
      Math.ceil(lastOccupiedBottom + CANVAS_PADDING_Y),
    ),
  };
}

/**
 * 可拖拽角色组件（Canvas 手动文字环绕版）
 * 区别于 CSS shape-outside 方案，这里采用 Canvas 渲染文本，通过算法计算每个字符位置，
 * 实现完全可控、精确避让图片区域的文字环绕效果。
 */
export default function DraggableCharacter({
  imageSrc,
  imageAlt = "角色立绘",
  markdownHtml,
  title = "旅行者档案",
}: DraggableCharacterProps) {
  // DOM 引用
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  // 拖拽位移值（相对于初始位置 BASE_LEFT / BASE_TOP）
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 容器尺寸
  const [containerSize, setContainerSize] = useState<Size>({
    width: 0,
    height: 0,
  });
  const [stageHeight, setStageHeight] = useState(STAGE_MIN_HEIGHT);
  // 预处理后的文本结构（包含分段和度量信息）
  const [preparedText, setPreparedText] =
    useState<PreparedTextWithSegments | null>(null);
  const hasCenteredCharacterRef = useRef(false);

  // 将传入的 Markdown HTML 转换为纯文本（用于 Canvas 绘制）
  const plainText = useMemo(
    () => htmlToPlainText(markdownHtml),
    [markdownHtml],
  );

  // ==================== 监听容器尺寸变化 ====================
  useEffect(() => {
    if (!stageRef.current) return;

    const updateSize = () => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(stageRef.current);

    return () => observer.disconnect();
  }, []);

  // ==================== 预处理文本（等待字体加载后） ====================
  useEffect(() => {
    let cancelled = false;

    async function prepareText() {
      if (typeof window === "undefined") return;

      // 确保字体已加载，否则 measureText 不准确
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      if (cancelled) return;

      const prepared = prepareWithSegments(plainText, BODY_FONT, {
        whiteSpace: "pre-wrap",
      });

      if (!cancelled) {
        setPreparedText(prepared);
      }
    }

    prepareText();

    return () => {
      cancelled = true;
    };
  }, [plainText]);

  // ==================== 计算拖拽约束边界 ====================
  // 约束目标：碰撞箱的四条边恰好贴合画布边缘时，x/y 的极值。
  //   hitboxLeft  = BASE_LEFT + x + HITBOX_OFFSET_L  →  x_min = -(BASE_LEFT + HITBOX_OFFSET_L)
  //   hitboxRight = BASE_LEFT + x + CHARACTER_WIDTH + HITBOX_OFFSET_R = containerWidth  →  x_max
  //   同理 y 方向
  const constraints = useMemo(() => {
    return {
      left: -(BASE_LEFT + HITBOX_OFFSET_L),
      right:
        containerSize.width - BASE_LEFT - CHARACTER_WIDTH - HITBOX_OFFSET_R,
      top: -(BASE_TOP + HITBOX_OFFSET_T),
      bottom:
        containerSize.height - BASE_TOP - CHARACTER_HEIGHT - HITBOX_OFFSET_B,
    };
  }, [containerSize.height, containerSize.width]);

  useEffect(() => {
    if (hasCenteredCharacterRef.current) return;
    if (containerSize.width <= 0 || containerSize.height <= 0) return;

    // 默认将角色放置在左上角：x=0 / y=0 对应图片左上角位于 (BASE_LEFT, BASE_TOP)
    x.set(0);
    y.set(0);
    hasCenteredCharacterRef.current = true;
  }, [containerSize.height, containerSize.width, x, y]);

  // ==================== Canvas 绘制函数 ====================
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !preparedText ||
      containerSize.width <= 0 ||
      containerSize.height <= 0
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(containerSize.width));
    const height = Math.max(1, Math.round(containerSize.height));

    // 设置画布尺寸（考虑设备像素比）
    if (
      canvas.width !== Math.round(width * dpr) ||
      canvas.height !== Math.round(height * dpr)
    ) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.font = BODY_FONT;
    ctx.fillStyle = BODY_TEXT_COLOR;
    ctx.textBaseline = "alphabetic";
    ctx.textRendering = "optimizeLegibility";

    // 构建矩形障碍物，以图片实际边界为基准，OBSTACLE_PAD 在 computeLineSlots 内追加
    const obstacle: CapsuleObstacle = {
      x: BASE_LEFT + x.get(),
      y: BASE_TOP + y.get(),
      width: CHARACTER_WIDTH,
      height: CHARACTER_HEIGHT,
    };

    // 计算所有字符的绘制坐标与所需总高度
    const { glyphs, requiredHeight } = buildGlyphProjection(
      ctx,
      preparedText,
      { width, height },
      obstacle,
    );

    if (requiredHeight !== stageHeight) {
      setStageHeight(requiredHeight);
    }

    // 逐个绘制字符
    for (const glyph of glyphs) {
      ctx.fillText(glyph.char, glyph.x, glyph.y);
    }
  }, [
    containerSize.height,
    containerSize.width,
    preparedText,
    stageHeight,
    x,
    y,
  ]);

  // ==================== 拖拽时触发重绘 ====================
  useEffect(() => {
    const scheduleDraw = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        drawCanvas();
      });
    };

    scheduleDraw();

    const unsubscribeX = x.on("change", scheduleDraw);
    const unsubscribeY = y.on("change", scheduleDraw);

    return () => {
      unsubscribeX();
      unsubscribeY();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null; // 必须归零，否则新 effect 的 scheduleDraw 会被提前 return 跳过
      }
    };
  }, [drawCanvas, x, y]);

  // ==================== 渲染 ====================
  return (
    <section className="rounded-2xl border border-genshin-gold/20 bg-genshin-dark/40 p-8 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
      {/* 标题区域 */}
      <div className="text-center mb-8">
        <h2 className="text-5xl font-bold mb-4">
          <span
            style={{
              background:
                "linear-gradient(90deg, #fbfaf6 0%, #ece5d8 36%, #d6b88e 68%, #b8936d 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 12px rgba(236, 229, 216, 0.18))",
            }}
          >
            {title}
          </span>
        </h2>
        <p className="text-genshin-gold text-sm md:text-base tracking-widest uppercase">
          拖拽人物可实时改变文本环绕布局
        </p>
      </div>

      {/* 舞台容器：相对定位，包含 Canvas 文字层和可拖拽图片层 */}
      <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-genshin-gold/10 bg-[radial-gradient(circle_at_top,_rgba(236,229,216,0.08),_rgba(12,18,32,0.18)_45%,_rgba(12,18,32,0.04)_100%)]">
        {/* 装饰背景层 */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_24%,rgba(236,229,216,0.08),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(184,147,109,0.06),transparent_24%)]" />

        <div className="relative z-10 p-4 md:p-8">
          <article className="relative rounded-[24px] border border-genshin-gold/20 bg-[linear-gradient(135deg,rgba(236,229,216,0.14),rgba(12,18,32,0.48))] px-6 py-6 md:px-8 md:py-8 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(236,229,216,0.08),transparent_38%,rgba(184,147,109,0.05)_100%)]" />

            {/* 文字绘制区域（根据排版结果动态高度） */}
            <div
              ref={stageRef}
              className="relative z-10 rounded-[18px] overflow-hidden"
              style={{
                height: `${stageHeight}px`,
                minHeight: `${STAGE_MIN_HEIGHT}px`,
              }}
            >
              {/* Canvas 画布：绘制排版后的文字 */}
              <canvas
                ref={canvasRef}
                aria-label={plainText}
                className="absolute inset-0 h-full w-full"
              />

              {/* 可拖拽角色图片层（覆盖在 Canvas 上方） */}
              <motion.figure
                className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
                style={{
                  x,
                  y,
                  left: BASE_LEFT,
                  top: BASE_TOP,
                  width: CHARACTER_WIDTH,
                }}
                drag
                dragElastic={0} // 无弹性，精确控制
                dragMomentum={false}
                dragConstraints={constraints}
                whileTap={{ scale: 0.98 }}
              >
                {/* 光晕动画层 */}
                <motion.div
                  className="absolute left-1/2 top-[58%] -z-10 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  animate={{
                    opacity: [0.28, 0.48, 0.3],
                    scale: [0.94, 1.08, 0.98],
                  }}
                  transition={{
                    duration: 4.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    background:
                      "radial-gradient(circle, rgba(184,147,109,0.34) 0%, rgba(236,229,216,0.18) 34%, rgba(184,147,109,0.08) 58%, rgba(184,147,109,0) 78%)",
                    filter: "blur(24px)",
                  }}
                />

                <img
                  src={imageSrc}
                  alt={imageAlt}
                  className="relative w-full h-auto object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.42)] pointer-events-none"
                  draggable={false}
                />
              </motion.figure>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
