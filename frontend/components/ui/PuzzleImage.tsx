'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';

// ─── Types ──────────────────────────────────────────────────────────────────
interface PuzzleSlide {
  src: string;
  side: 'left' | 'right';
}

interface PuzzleImageProps {
  slides: PuzzleSlide[];
  cols?: number;
  rows?: number;
  pieceSize?: number;
  className?: string;
}

interface Piece {
  id: number;
  col: number;
  row: number;
  targetX: number;
  targetY: number;
  scatterX: number;
  scatterY: number;
  scatterRotation: number;
  scatterScale: number;
}

// ─── Snap a value to the nearest grid line ──────────────────────────────────
function snapToGrid(val: number, gridSize: number): number {
  return Math.round(val / gridSize) * gridSize;
}

// ─── Generate a scatter position that avoids the center heading zone ────────
function generateScatter(
  parentW: number,
  parentH: number,
  gridSize: number
): { x: number; y: number; rot: number; scale: number } {
  const centerDeadZoneW = parentW * 0.50; // wide enough for full heading
  const centerDeadZoneH = parentH * 0.65; // covers heading + subtitle + buttons

  let x: number;
  let y: number;
  let attempts = 0;

  do {
    x = (Math.random() - 0.5) * parentW * 0.88;
    y = (Math.random() - 0.5) * parentH * 0.82;
    attempts++;
  } while (
    Math.abs(x) < centerDeadZoneW / 2 &&
    Math.abs(y) < centerDeadZoneH / 2 &&
    attempts < 30
  );

  // Snap to background grid
  x = snapToGrid(x, gridSize);
  y = snapToGrid(y, gridSize);

  return {
    x,
    y,
    rot: (Math.random() - 0.5) * 40, // subtle rotation for grid-aligned feel
    scale: 0.85 + Math.random() * 0.15,
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function PuzzleImage({
  slides,
  cols = 3,
  rows = 4,
  pieceSize = 300,
  className = '',
}: PuzzleImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const piecesRef = useRef<HTMLDivElement[]>([]);
  const shineRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const kickoffRef = useRef<gsap.core.Tween | null>(null);
  const slideIndexRef = useRef(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const loadedImages = useRef<HTMLImageElement[]>([]);

  const GRID_SIZE = 100; // Must match hero background grid
  const totalPieces = cols * rows;

  // Make pieces exactly 100×100 to match the background grid
  const pieceW = GRID_SIZE;
  const pieceH = GRID_SIZE;
  const imgW = cols * pieceW;  // 300
  const imgH = rows * pieceH;  // 400

  // ─── Preload all images ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const promises = slides.map(
      (slide) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = slide.src;
        })
    );

    Promise.all(promises)
      .then((imgs) => {
        if (cancelled) return;
        loadedImages.current = imgs;
        setImagesLoaded(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slides]);

  // ─── Slice image onto canvas pieces ─────────────────────────────────────
  const sliceImage = useCallback(
    (imgIndex: number) => {
      const img = loadedImages.current[imgIndex];
      if (!img) return;

      const srcPieceW = img.naturalWidth / cols;
      const srcPieceH = img.naturalHeight / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          const canvas = canvasRefs.current[idx];
          if (!canvas) continue;

          canvas.width = pieceW * 2; // 2x for retina
          canvas.height = pieceH * 2;
          canvas.style.width = `${pieceW}px`;
          canvas.style.height = `${pieceH}px`;

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            c * srcPieceW,
            r * srcPieceH,
            srcPieceW,
            srcPieceH,
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      }
    },
    [cols, rows, pieceW, pieceH]
  );

  // ─── Generate pieces array ──────────────────────────────────────────────
  const generatePieces = useCallback(
    (parentW: number, parentH: number): Piece[] => {
      const pieces: Piece[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const scatter = generateScatter(parentW, parentH, GRID_SIZE);
          pieces.push({
            id: r * cols + c,
            col: c,
            row: r,
            targetX: c * pieceW - imgW / 2,
            targetY: r * pieceH - imgH / 2,
            scatterX: scatter.x,
            scatterY: scatter.y,
            scatterRotation: scatter.rot,
            scatterScale: scatter.scale,
          });
        }
      }
      return pieces;
    },
    [cols, rows, pieceW, pieceH, imgW, imgH]
  );

  // ─── Main animation cycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!imagesLoaded || !containerRef.current || slides.length === 0) return;

    const container = containerRef.current;
    const parentW = container.offsetWidth;
    const parentH = container.offsetHeight;

    const piecesEls = piecesRef.current;
    const shineEl = shineRef.current;
    const frameEl = frameRef.current;
    const slidesArr = slides;
    const numSlides = slides.length;

    function runCycle() {
      const idx = slideIndexRef.current;
      const slide = slidesArr[idx];
      const pieces = generatePieces(parentW, parentH);

      sliceImage(idx);

      // Assembly position: left or right of center
      const offsetX = slide.side === 'left' ? -parentW * 0.28 : parentW * 0.28;
      const offsetY = 0;

      // Set all pieces to scattered positions (avoiding center)
      pieces.forEach((p) => {
        const el = piecesEls[p.id];
        if (!el) return;
        gsap.set(el, {
          x: p.scatterX,
          y: p.scatterY,
          rotation: p.scatterRotation,
          scale: p.scatterScale,
          opacity: 0,
        });
      });

      // Position frame
      if (frameEl) {
        gsap.set(frameEl, {
          x: offsetX - imgW / 2 - 6,
          y: offsetY - imgH / 2 - 6,
          width: imgW + 12,
          height: imgH + 12,
          opacity: 0,
          scale: 0.95,
        });
      }

      const tl = gsap.timeline({
        onComplete: () => {
          slideIndexRef.current = (slideIndexRef.current + 1) % numSlides;
          gsap.delayedCall(0.8, runCycle);
        },
      });

      timelineRef.current = tl;

      // ── Phase 1: Fade in pieces at scattered grid-aligned positions ──
      const validEls = piecesEls.filter(Boolean);
      tl.to(
        validEls,
        {
          opacity: 0.85,
          duration: 0.6,
          stagger: { each: 0.03, from: 'random' },
        },
        0
      );

      // ── Phase 2: Assemble pieces one-by-one (slower, more deliberate) ──
      const assemblyOrder = [...pieces].sort(() => Math.random() - 0.5);
      const staggerGap = 0.12; // Slower stagger for dramatic build-up

      assemblyOrder.forEach((p, i) => {
        const el = piecesEls[p.id];
        if (!el) return;

        tl.to(
          el,
          {
            x: p.targetX + offsetX,
            y: p.targetY + offsetY,
            rotation: 0,
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: 'back.out(1.1)',
          },
          0.7 + i * staggerGap
        );
      });

      const assemblyEnd = 0.7 + totalPieces * staggerGap + 0.6;

      // ── Phase 3: Brutalist frame ──
      if (frameEl) {
        tl.to(
          frameEl,
          { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' },
          assemblyEnd - 0.15
        );
      }

      // ── Phase 4: Shine sweep (aligned precisely to image bounds) ──
      if (shineEl) {
        tl.fromTo(
          shineEl,
          {
            x: offsetX - imgW / 2,
            y: offsetY - imgH / 2,
            opacity: 0,
          },
          {
            x: offsetX + imgW / 2,
            opacity: 1,
            duration: 0.7,
            ease: 'power2.inOut',
            onComplete: () => {
              gsap.to(shineEl, { opacity: 0, duration: 0.25 });
            },
          },
          assemblyEnd + 0.1
        );
      }

      // ── Phase 5: Hold ──
      tl.to({}, { duration: 2.5 }, assemblyEnd + 0.8);

      // ── Phase 6: Scatter away (slower) ──
      const scatterStart = assemblyEnd + 0.8 + 2.5;
      const newScatter = generatePieces(parentW, parentH);

      if (frameEl) {
        tl.to(
          frameEl,
          { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' },
          scatterStart
        );
      }

      newScatter.forEach((p, i) => {
        const el = piecesEls[p.id];
        if (!el) return;
        tl.to(
          el,
          {
            x: p.scatterX,
            y: p.scatterY,
            rotation: p.scatterRotation,
            scale: p.scatterScale,
            opacity: 0,
            duration: 0.55,
            ease: 'power2.in',
          },
          scatterStart + i * 0.06
        );
      });
    }

    kickoffRef.current = gsap.delayedCall(1.5, runCycle);

    return () => {
      if (kickoffRef.current) kickoffRef.current.kill();
      if (timelineRef.current) timelineRef.current.kill();
      gsap.killTweensOf(piecesEls.filter(Boolean));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesLoaded]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden hidden md:block ${className}`}
      style={{ zIndex: 5 }}
    >
      {/* Puzzle Pieces */}
      {Array.from({ length: totalPieces }).map((_, idx) => (
        <div
          key={idx}
          ref={(el) => {
            if (el) piecesRef.current[idx] = el;
          }}
          className="absolute will-change-transform"
          style={{
            left: '50%',
            top: '50%',
            width: pieceW,
            height: pieceH,
            opacity: 0,
          }}
        >
          <canvas
            ref={(el) => {
              if (el) canvasRefs.current[idx] = el;
            }}
            className="block w-full h-full"
          />
        </div>
      ))}

      {/* Brutalist Frame */}
      <div
        ref={frameRef}
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          opacity: 0,
          border: '3px solid #0f172a',
          borderRadius: '0.5rem',
          boxShadow: '6px 6px 0 #0f172a',
          zIndex: 6,
        }}
      />

      {/* Shine Sweep */}
      <div
        ref={shineRef}
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          width: 60,
          height: imgH,
          opacity: 0,
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 10%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 90%, transparent 100%)',
          filter: 'blur(4px)',
          zIndex: 11,
        }}
      />
    </div>
  );
}
