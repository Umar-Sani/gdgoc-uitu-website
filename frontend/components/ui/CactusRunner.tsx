'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

const SPEED = 5.2;

// Front (z:20) tall, in front of text. Back (z:3) short, behind text and character.
const OBSTACLES = [
  { src: '/images/Android%20Running/c1.png', delay: 0.0, z: 20, h: 160 },
  { src: '/images/Android%20Running/c3.png', delay: 1.8, z: 3, h: 80 },
  { src: '/images/Android%20Running/c2.png', delay: 3.5, z: 20, h: 160 },
  { src: '/images/Android%20Running/c1.png', delay: 0.9, z: 3, h: 80 },
  { src: '/images/Android%20Running/c3.png', delay: 2.7, z: 20, h: 160 },
];

export default function CactusRunner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    OBSTACLES.forEach((obs, i) => {
      gsap.fromTo(
        `.cactus-runner-${i}`,
        { x: '115vw' },
        { x: -260, duration: SPEED, delay: obs.delay, ease: 'none', repeat: -1 }
      );
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none"
      aria-hidden="true"
    >
      {OBSTACLES.map((obs, i) => (
        <div
          key={i}
          className={`cactus-runner-${i} absolute bottom-0 w-auto translate-y-[14px]`}
          style={{ zIndex: obs.z, height: obs.h }}
        >
          <img
            src={obs.src}
            alt=""
            className="h-full w-auto object-contain object-bottom select-none"
            style={{ filter: 'brightness(0)', opacity: obs.z === 20 ? 0.18 : 0.1 }}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
