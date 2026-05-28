'use client';

import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'], weight: ['400', '700'] });

const TECHNOLOGIES = [
  { name: 'Flutter', color: '#54C5F8', icon: '📱' },
  { name: 'AI / ML', color: '#FF7043', icon: '🤖' },
  { name: 'Web Dev', color: '#42A5F5', icon: '🌐' },
  { name: 'Cloud', color: '#26A69A', icon: '☁️' },
  { name: 'Android', color: '#66BB6A', icon: '🤖' },
  { name: 'Open Source', color: '#AB47BC', icon: '🔓' },
  { name: 'Cybersecurity', color: '#EF5350', icon: '🔒' },
  { name: 'DevOps', color: '#78909C', icon: '⚙️' },
];

export default function TechnologiesGrid() {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    const stage = stageRef.current;
    const cards = cardsRef.current.filter(Boolean);
    if (!stage || !cards.length) return;

    const radius = 300; // Activation radius in pixels
    const maxScale = 1.4; // Max scale when cursor is directly over the center
    const dur = 0.35;

    const handleMouseMove = (e: MouseEvent) => {
      const mx = e.clientX;
      const my = e.clientY;

      cards.forEach((card) => {
        if (!card) return;
        const r = card.getBoundingClientRect();
        // Calculate distance from cursor to center of the card
        const d = Math.hypot(
          mx - (r.left + r.width / 2),
          my - (r.top + r.height / 2)
        );
        
        // Map distance to a progress value (0 to 1)
        const p = gsap.utils.clamp(0, 1, gsap.utils.mapRange(0, radius, 1, 0, d));
        
        gsap.to(card, {
          scale: 1 + (maxScale - 1) * p,
          zIndex: Math.round(p * 100), // bring closer elements to top
          overwrite: true,
          ease: "power2.out",
          duration: dur,
        });
      });
    };

    const handleMouseLeave = () => {
      cards.forEach((card) => {
        if (!card) return;
        gsap.to(card, {
          scale: 1,
          zIndex: 1,
          duration: dur * 2,
          overwrite: true,
          ease: "power2.out"
        });
      });
    };

    stage.addEventListener("mousemove", handleMouseMove);
    stage.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      stage.removeEventListener("mousemove", handleMouseMove);
      stage.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, { scope: stageRef });

  return (
    <section className="py-24 bg-white border-y-[6px] border-slate-900 overflow-hidden relative flex flex-col items-center">
      <div className="w-full px-6 mb-12 text-center">
        <div className="h-1.5 w-16 flex mb-4 border-2 border-slate-900 mx-auto shadow-[3px_3px_0_#0f172a]">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none ${antonio.className}`}>
          Technologies We Cover
        </h2>
        <p className="text-sm sm:text-base font-bold text-slate-500 uppercase tracking-widest mt-4">
          From mobile to cloud — we cover the full stack
        </p>
      </div>

      <div 
        ref={stageRef} 
        className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-12 relative"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-16 lg:gap-20 justify-items-center">
          {TECHNOLOGIES.map((tech, idx) => (
            <div
              key={tech.name}
              // @ts-ignore
              ref={(el) => (cardsRef.current[idx] = el)}
              className="tech-card w-full max-w-[140px] sm:max-w-[160px] aspect-square flex flex-col items-center justify-center bg-white border-[3px] border-slate-900 rounded-[1.5rem] shadow-[6px_6px_0_#0f172a] relative overflow-hidden transition-colors"
              style={{ position: 'relative', zIndex: 1, transformOrigin: 'center center' }}
            >
              {/* Tech color background reveal on hover - managed by CSS */}
              <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ backgroundColor: tech.color }} 
              />
              
              <div className="text-4xl sm:text-5xl mb-4 relative z-10">
                {tech.icon}
              </div>
              <div
                className="w-10 h-1.5 rounded-full mb-3 border-2 border-slate-900 relative z-10"
                style={{ backgroundColor: tech.color }}
              />
              <p className={`text-sm sm:text-base font-black uppercase tracking-widest text-slate-900 relative z-10 ${antonio.className}`}>
                {tech.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
