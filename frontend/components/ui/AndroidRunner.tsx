'use client';

import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const RUN_FRAMES = [
  '/images/Android%20Running/1.png',
  '/images/Android%20Running/2.png',
  '/images/Android%20Running/3.png',
];

const SPEED = 5.2;

// Front (z:20) = tall, in front of text; Back (z:3) = short, behind mascot (z:5) and text
const OBSTACLES = [
  { src: '/images/Android%20Running/c1.png', delay: 0.0, z: 20, h: 160 },
  { src: '/images/Android%20Running/c3.png', delay: 1.8, z: 3,  h: 88  },
  { src: '/images/Android%20Running/c2.png', delay: 3.5, z: 20, h: 160 },
  { src: '/images/Android%20Running/c1.png', delay: 0.9, z: 3,  h: 88  },
  { src: '/images/Android%20Running/c3.png', delay: 2.7, z: 20, h: 160 },
];

export default function AndroidRunner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameIdx, setFrameIdx] = useState(0);

  // Preload all run frames so src swaps are instant (no flicker)
  useEffect(() => {
    RUN_FRAMES.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Cycle frames — no key prop, just update src on the same DOM node
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setFrameIdx(prev => (prev + 1) % RUN_FRAMES.length);
    }, 120);
    return () => clearInterval(id);
  }, []);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    OBSTACLES.forEach((obs, i) => {
      gsap.fromTo(
        `.android-obstacle-${i}`,
        { x: '115vw' },
        { x: -260, duration: SPEED, delay: obs.delay, ease: 'none', repeat: -1 }
      );
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground/25" />
      <div className="absolute bottom-[3px] left-0 right-0 h-[1px] bg-foreground/10" />

      {/* Mascot — no translate, sits naturally at bottom-0 */}
      <div className="absolute bottom-0 left-[6%] w-28 h-40 z-[5]">
        {/* No key prop — React reuses the same img node and just swaps src, no flicker */}
        <img
          src={RUN_FRAMES[frameIdx]}
          alt=""
          className="w-full h-full object-contain object-bottom select-none"
          draggable={false}
        />
      </div>

      {/* Cacti — translate-y pushes their bases into the ground line */}
      {OBSTACLES.map((obs, i) => (
        <div
          key={i}
          className={`android-obstacle-${i} absolute bottom-0 w-auto translate-y-[14px]`}
          style={{ zIndex: obs.z, height: obs.h }}
        >
          <img
            src={obs.src}
            alt=""
            className="h-full w-auto object-contain object-bottom select-none"
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
