'use client';

import React, { useRef, useState, MouseEvent } from 'react';
import { motion } from 'framer-motion';

interface MagneticProps {
  children: React.ReactNode;
  springOptions?: { 
    type?: "spring";
    bounce?: number; 
    duration?: number; 
    stiffness?: number; 
    damping?: number; 
    mass?: number;
  };
  intensity?: number;
}

export default function Magnetic({ 
  children, 
  springOptions = { type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }, 
  intensity = 0.25 
}: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * intensity, y: middleY * intensity });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: 'spring', ...springOptions }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}
