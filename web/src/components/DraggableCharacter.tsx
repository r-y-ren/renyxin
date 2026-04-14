import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface DraggableCharacterProps {
  imageSrc: string;
  imageAlt?: string;
  markdownHtml: string;
  title?: string;
}

const CHARACTER_WIDTH = 250;
const CHARACTER_HEIGHT = 360;
const BASE_LEFT = 16;
const BASE_TOP = 24;
const FORCE_FIELD_RADIUS = 120;
const FORCE_FIELD_SIDE_GAP = 18;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function DraggableCharacter({
  imageSrc,
  imageAlt = "角色立绘",
  markdownHtml,
  title = "旅行者档案",
}: DraggableCharacterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Use spring-smoothed values for text reflow updates to avoid jitter.
  const smoothX = useSpring(x, { stiffness: 240, damping: 32, mass: 0.35 });
  const smoothY = useSpring(y, { stiffness: 240, damping: 32, mass: 0.35 });

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [shapeOffset, setShapeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateShape = () => {
      const nextX = smoothX.get();
      const nextY = smoothY.get();
      setShapeOffset({ x: nextX, y: nextY });
      frameRef.current = null;
    };

    const schedule = () => {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(updateShape);
    };

    const unsubX = smoothX.on("change", schedule);
    const unsubY = smoothY.on("change", schedule);

    return () => {
      unsubX();
      unsubY();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [smoothX, smoothY]);

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

  const characterCenterX = BASE_LEFT + shapeOffset.x + CHARACTER_WIDTH / 2;
  const isOnLeftSide = characterCenterX < containerSize.width / 2;

  const forceFieldMarginTop = clamp(
    BASE_TOP + shapeOffset.y,
    0,
    Math.max(0, containerSize.height - CHARACTER_HEIGHT),
  );

  return (
    <section className="rounded-2xl border border-genshin-gold/20 bg-genshin-dark/40 p-8 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
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

      <div
        ref={containerRef}
        className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-genshin-gold/10 bg-[radial-gradient(circle_at_top,_rgba(236,229,216,0.08),_rgba(12,18,32,0.18)_45%,_rgba(12,18,32,0.04)_100%)]"
      >
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_24%,rgba(236,229,216,0.08),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(184,147,109,0.06),transparent_24%)]" />

        <div className="relative z-10 p-4 md:p-8">
          <article className="relative overflow-hidden rounded-[24px] border border-genshin-gold/20 bg-[linear-gradient(135deg,rgba(236,229,216,0.14),rgba(12,18,32,0.48))] px-6 py-6 md:px-8 md:py-8 shadow-[0_12px_40px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(236,229,216,0.08),transparent_38%,rgba(184,147,109,0.05)_100%)]" />

            {/* Phantom box: fixed size, moved by marginTop/float to push text naturally. */}
            <div
              aria-hidden="true"
              style={
                {
                  float: isOnLeftSide ? "left" : "right",
                  width: `${CHARACTER_WIDTH}px`,
                  height: `${CHARACTER_HEIGHT}px`,
                  marginTop: `${forceFieldMarginTop}px`,
                  marginRight: isOnLeftSide
                    ? `${FORCE_FIELD_SIDE_GAP}px`
                    : "0px",
                  marginLeft: isOnLeftSide
                    ? "0px"
                    : `${FORCE_FIELD_SIDE_GAP}px`,
                  shapeOutside: `circle(${FORCE_FIELD_RADIUS}px at 50% 50%)`,
                  WebkitShapeOutside: `circle(${FORCE_FIELD_RADIUS}px at 50% 50%)`,
                } as React.CSSProperties & { WebkitShapeOutside: string }
              }
            />

            <div
              className="intro-prose prose prose-invert max-w-none text-genshin-light/90 text-justify [text-wrap:pretty] [&_h2]:mb-6 [&_h2]:text-4xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-[0.02em] [&_h2]:md:text-5xl [&_h2]:text-transparent [&_h2]:bg-clip-text [&_h2]:bg-[linear-gradient(90deg,#fbfaf6_0%,#ece5d8_36%,#d6b88e_68%,#b8936d_100%)] [&_h2]:drop-shadow-[0_0_18px_rgba(236,229,216,0.14)] [&_p]:mb-6 [&_p]:leading-loose [&_p]:text-justify [&_ul]:mb-6 [&_ul]:leading-loose [&_li]:mb-2"
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          </article>
        </div>

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
          dragElastic={0.08}
          dragMomentum={false}
          dragConstraints={constraints}
          whileTap={{ scale: 0.98 }}
        >
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
    </section>
  );
}
