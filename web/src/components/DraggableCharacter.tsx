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
const BASE_LEFT = 6; // 图片初始左偏移
const BASE_TOP = 5; // 图片初始上偏移
const BODY_FONT_SIZE = 20; // 正文字体大小（像素）
const BODY_LINE_HEIGHT = 34; // 正文行高（像素）
const BODY_FONT = `${BODY_FONT_SIZE}px Georgia, "Times New Roman", serif`; // 字体描述
const BODY_TEXT_COLOR = "rgba(236, 229, 216, 0.92)"; // 正文颜色
const CANVAS_PADDING_X = 4; // 画布水平内边距
const CANVAS_PADDING_Y = 2; // 画布垂直内边距
const OBSTACLE_PAD_X = 6; // 障碍物水平额外内缩量（避免文字紧贴图片）
const OBSTACLE_PAD_Y = 6; // 障碍物垂直额外内缩量
const STAGE_MIN_HEIGHT = 560; // 舞台最小高度（未使用，保留备用）

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
 * 基于胶囊体障碍物（带内边距）与行的相交情况，返回左/右两侧可排文的区域
 */
function computeLineSlots(
  lineTop: number,
  lineBottom: number,
  innerWidth: number,
  obstacle: CapsuleObstacle,
): LineSlot[] {
  // 扩大障碍物区域，加入内边距
  const expandedX = obstacle.x - OBSTACLE_PAD_X;
  const expandedY = obstacle.y - OBSTACLE_PAD_Y;
  const expandedW = obstacle.width + OBSTACLE_PAD_X * 2;
  const expandedH = obstacle.height + OBSTACLE_PAD_Y * 2;
  const obstacleTop = expandedY;
  const obstacleBottom = expandedY + expandedH;
  const intersects = lineBottom > obstacleTop && lineTop < obstacleBottom;

  // 若无交集，整行可用
  if (!intersects) {
    return [{ x: 0, width: innerWidth }];
  }

  // 计算胶囊体的圆角半径（取宽高较小一半，因为胶囊两端是半圆）
  const radius = Math.min(expandedW / 2, expandedH / 2);
  const centerX = expandedX + expandedW / 2;
  const topCapCenterY = expandedY + radius;
  const bottomCapCenterY = expandedY + expandedH - radius;

  /**
   * 根据垂直位置 Y 计算胶囊体在该高度处的半宽（垂直于 X 轴的半径）
   * - 上端半圆区域用圆弧公式 sqrt(r² - dy²)
   * - 下端半圆区域同理
   * - 中间矩形部分直接取半径（即宽的一半）
   */
  const halfWidthAtY = (sampleY: number) => {
    if (sampleY < topCapCenterY) {
      const dy = topCapCenterY - sampleY;
      return Math.sqrt(Math.max(0, radius * radius - dy * dy));
    }

    if (sampleY > bottomCapCenterY) {
      const dy = sampleY - bottomCapCenterY;
      return Math.sqrt(Math.max(0, radius * radius - dy * dy));
    }

    return expandedW / 2;
  };

  // 采样行的顶部、中部、底部三处，取最大半宽以确保完全避让障碍物
  const bandMidY = (lineTop + lineBottom) / 2;
  const halfWidth = Math.max(
    halfWidthAtY(lineTop),
    halfWidthAtY(bandMidY),
    halfWidthAtY(lineBottom),
  );

  const blockedLeft = Math.max(0, centerX - halfWidth);
  const blockedRight = Math.min(innerWidth, centerX + halfWidth);

  const leftWidth = Math.max(0, blockedLeft);
  const rightX = Math.max(0, blockedRight);
  const rightWidth = Math.max(0, innerWidth - rightX);
  const slots: LineSlot[] = [];

  // 仅当槽位宽度足以容纳至少约2个字符时才添加（避免极端窄的碎片槽）
  if (leftWidth >= BODY_FONT_SIZE * 2) {
    slots.push({ x: 0, width: leftWidth });
  }

  if (rightWidth >= BODY_FONT_SIZE * 2) {
    slots.push({ x: rightX, width: rightWidth });
  }

  // 若没有有效槽位，返回一个全宽槽位防止死循环（实际上很少触发）
  return slots.length > 0 ? slots : [{ x: 0, width: innerWidth }];
}

/**
 * 构建字形投影数组：根据容器尺寸、障碍物位置，计算所有字符的绘制坐标
 * 核心算法：
 * 1. 逐行遍历（根据行高递增）
 * 2. 对每行计算可用槽位
 * 3. 在每个槽位内调用 pretext 库的 layoutNextLineRange 获取能放入的字符范围
 * 4. 获取实际文本，按字素分割并累加每个字符的宽度，记录坐标
 */
function buildGlyphProjection(
  ctx: CanvasRenderingContext2D,
  prepared: PreparedTextWithSegments,
  canvasSize: Size,
  obstacle: CapsuleObstacle,
): PositionedGlyph[] {
  const innerWidth = Math.max(0, canvasSize.width - CANVAS_PADDING_X * 2);
  const innerHeight = Math.max(0, canvasSize.height - CANVAS_PADDING_Y * 2);
  const baselineOffset = BODY_FONT_SIZE * 0.84; // 基线偏移经验值，使文字垂直居中
  const glyphs: PositionedGlyph[] = [];
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

  for (
    let lineTop = 0;
    lineTop + BODY_LINE_HEIGHT <= innerHeight;
    lineTop += BODY_LINE_HEIGHT
  ) {
    const lineBottom = lineTop + BODY_LINE_HEIGHT;
    const slots = computeLineSlots(lineTop, lineBottom, innerWidth, obstacle);
    let consumedOnBand = false; // 标记当前行是否至少排入了一些字符

    for (const slot of slots) {
      const range = layoutNextLineRange(prepared, cursor, slot.width);
      if (range === null) {
        // 文本已排完
        return glyphs;
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
    }

    // 如果该行没有任何字符被消费，说明遇到了无法排版的极窄区域，直接跳过行（很少发生）
    if (!consumedOnBand) {
      continue;
    }
  }

  return glyphs;
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
  // 预处理后的文本结构（包含分段和度量信息）
  const [preparedText, setPreparedText] =
    useState<PreparedTextWithSegments | null>(null);

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
  const constraints = useMemo(() => {
    const maxX = Math.max(0, containerSize.width - BASE_LEFT - CHARACTER_WIDTH);
    const maxY = Math.max(
      0,
      containerSize.height - BASE_TOP - CHARACTER_HEIGHT,
    );

    return {
      left: -BASE_LEFT,
      top: -BASE_TOP,
      right: maxX,
      bottom: maxY,
    };
  }, [containerSize.height, containerSize.width]);

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

    // 障碍物内缩量，使文字与图片之间留有间距，视觉更舒适
    const HITBOX_SHRINK = 25;

    // 构建障碍物（胶囊体），坐标基于图片当前位置
    const obstacle: CapsuleObstacle = {
      x: BASE_LEFT + x.get() + HITBOX_SHRINK,
      y: BASE_TOP + y.get() + HITBOX_SHRINK,
      width: CHARACTER_WIDTH - HITBOX_SHRINK * 2,
      height: CHARACTER_HEIGHT - HITBOX_SHRINK * 2,
    };

    // 计算所有字符的绘制坐标
    const glyphs = buildGlyphProjection(
      ctx,
      preparedText,
      { width, height },
      obstacle,
    );

    // 逐个绘制字符
    for (const glyph of glyphs) {
      ctx.fillText(glyph.char, glyph.x, glyph.y);
    }
  }, [containerSize.height, containerSize.width, preparedText, x, y]);

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

            {/* 文字绘制区域（固定高度，用于 Canvas） */}
            <div
              ref={stageRef}
              className="relative z-10 h-[560px] md:h-[620px] rounded-[18px] overflow-hidden"
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
