'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface MagneticProps {
  children: React.ReactNode;
  intensity?: number;
  duration?: number;
  ease?: string;
}

export default function Magnetic({ 
  children, 
  intensity = 0.35,
  duration = 0.6,
  ease = "power3.out"
}: MagneticProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const xTo = useRef<any>(null);
  const yTo = useRef<any>(null);

  useGSAP(() => {
    // Initialize quickTo for high-performance updates
    xTo.current = gsap.quickTo(containerRef.current, "x", { duration, ease });
    yTo.current = gsap.quickTo(containerRef.current, "y", { duration, ease });
  }, { scope: containerRef });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const { clientX, clientY } = e;
    const { height, width, left, top } = containerRef.current.getBoundingClientRect();
    
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    
    xTo.current(middleX * intensity);
    yTo.current(middleY * intensity);
  };

  const handleMouseLeave = () => {
    xTo.current(0);
    yTo.current(0);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="inline-block relative group/magnetic"
    >
      {/* Expanded invisible hit area so the magnetic pull starts *before* touching the button */}
      <div className="absolute -inset-8 md:-inset-12 z-0 rounded-full" />
      
      <div className="relative z-10 pointer-events-auto">
        {children}
      </div>
    </div>
  );
}
