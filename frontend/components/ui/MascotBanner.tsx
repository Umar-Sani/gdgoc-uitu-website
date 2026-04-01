'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useTransform, useMotionValue, useSpring } from 'framer-motion';

export default function MascotBanner({ announcement }: { announcement: string | null }) {
  // Global Cursor Tracking parameters
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    // Only apply on non-touch devices
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to [-1, 1]
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Smooth the tracking to make it less jittery
  const smoothMouseX = useSpring(mouseX, { stiffness: 150, damping: 30 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 150, damping: 30 });

  const [hasHovered, setHasHovered] = useState(false);
  const [isFlyingIn, setIsFlyingIn] = useState(true);
  const [isRobotHovering, setIsRobotHovering] = useState(false);

  // When the mascot is hovered, they follow the mouse eagerly
  // When not hovered, they "look up" slightly with a smaller range
  const trackingFactorX = useTransform(smoothMouseX, (v) => {
    const factor = hasHovered ? (isRobotHovering ? 1.0 : 0.6) : 0.2;
    return v * factor;
  });
  
  const trackingFactorY = useTransform(smoothMouseY, (v) => {
    const factor = hasHovered ? (isRobotHovering ? 1.0 : 0.6) : 0.2;
    // Special bounding to keep them looking slightly up by default if positive
    return Math.min(v * factor, 0.5); 
  });

  // Map normalized mouse vectors into parallax pixel offsets
  const headOffsetX = useTransform(trackingFactorX, [-1, 1], [-6, 6]);
  const headOffsetY = useTransform(trackingFactorY, [-1, 1], [-4, 8]); // Tweaked the Y logic for simpler clamping

  const eyesOffsetX = useTransform(trackingFactorX, [-1, 1], [-12, 12]);
  const eyesOffsetY = useTransform(trackingFactorY, [-1, 1], [-8, 16]);

  // DO NOT RENDER IF NO ANNOUNCEMENT
  if (!announcement) return null;

  return (
    <motion.div
      className="fixed bottom-8 right-24 z-50 hidden md:block" // hidden on small screens? Wait, keeping original classes.
    >
      {/* 🔥 Mascot Button */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        onAnimationComplete={() => setTimeout(() => setIsFlyingIn(false), 2000)}
        className="relative"
      >
        {/* Graceful organic floating container */}
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <button
            type="button"
            onMouseEnter={() => {
              setHasHovered(true);
              setIsRobotHovering(true);
            }}
            onMouseLeave={() => setIsRobotHovering(false)}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="relative p-0 border-0 bg-transparent shadow-none transition-transform active:scale-95 group"
          >
            <svg className="w-20 h-28 md:w-24 md:h-32 overflow-visible" viewBox="0 -20 200 260" fill="none">
              {/* Left Antenna */}
              <motion.line
                x1="70" y1="45" x2="52" y2="15"
                stroke="#BDC1C6" strokeWidth="6" strokeLinecap="round"
                animate={{ rotate: isRobotHovering ? [-8, 8, -8] : [-2, 2, -2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '70px 45px' }}
              />

              {/* Right Antenna */}
              <motion.line
                x1="130" y1="45" x2="148" y2="15"
                stroke="#BDC1C6" strokeWidth="6" strokeLinecap="round"
                animate={{ rotate: isRobotHovering ? [8, -8, 8] : [2, -2, 2] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                style={{ transformOrigin: '130px 45px' }}
              />

              {/* Left Arm - Friendly Waving by Default / Stops on Hover */}
              <motion.g
                animate={{ rotate: isRobotHovering ? -10 : [130, 80, 130] }}
                transition={
                  isRobotHovering 
                  ? { type: "spring", stiffness: 300, damping: 20 }
                  : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                }
                style={{ transformOrigin: '35px 92px' }}
              >
                <rect x="21" y="78" width="28" height="85" rx="14" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
              </motion.g>

              {/* Right Arm */}
              <motion.g
                animate={isRobotHovering ? { rotate: [10, -5, 10] } : { rotate: [10, -10, 10] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                style={{ transformOrigin: '165px 96px' }}
              >
                <rect x="151" y="82" width="28" height="85" rx="14" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
                {/* Google Tech Laptop */}
                <g transform="translate(135, 120) rotate(-15)">
                  <rect x="0" y="0" width="60" height="38" rx="4" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="2.5" />
                  <line x1="0" y1="34" x2="60" y2="34" stroke="#DADCE0" strokeWidth="2.5" />
                  {/* GDG / Google color dots */}
                  <circle cx="20" cy="17" r="3" fill="#4285F4" />
                  <circle cx="28" cy="17" r="3" fill="#EA4335" />
                  <circle cx="36" cy="17" r="3" fill="#FBBC05" />
                  <circle cx="44" cy="17" r="3" fill="#34A853" />
                </g>
              </motion.g>

              {/* Legs */}
              <motion.g
                animate={{ y: [-3, 3, -3], rotate: [-4, 4, -4] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '79px 184px' }}
              >
                <rect x="65" y="170" width="28" height="60" rx="14" fill="#E8EAED" stroke="#BDC1C6" strokeWidth="4" />
              </motion.g>
              <motion.g
                animate={{ y: [3, -3, 3], rotate: [4, -4, 4] }}
                transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                style={{ transformOrigin: '121px 184px' }}
              >
                <rect x="107" y="170" width="28" height="60" rx="14" fill="#E8EAED" stroke="#BDC1C6" strokeWidth="4" />
              </motion.g>

              {/* Body Engine */}
              <motion.g animate={{ scaleY: [1, 1.02, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: '100px 180px' }}>
                <rect x="45" y="85" width="110" height="95" rx="20" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
                {/* Flat darker shadow strip under the head */}
                <path d="M 47 94 Q 100 85 153 94 L 153 98 L 47 98 Z" fill="#E8EAED" />

                {/* Employee Lanyard */}
                <path d="M 65 95 L 94 135" stroke="#3C4043" strokeWidth="2.5" />
                <path d="M 135 95 L 106 135" stroke="#3C4043" strokeWidth="2.5" />
                
                {/* Google Employee ID Badge */}
                <rect x="85" y="130" width="30" height="40" rx="3" fill="#FFFFFF" stroke="#DADCE0" strokeWidth="1.5" />
                <rect x="91" y="135" width="18" height="15" rx="2" fill="#E8EAED" />
                {/* Profile silhouette */}
                <circle cx="100" cy="141" r="4" fill="#BDBDBD" />
                <path d="M 94 150 Q 100 145 106 150" stroke="#BDBDBD" strokeWidth="2" fill="none" />
                {/* ID Lines */}
                <rect x="91" y="154" width="18" height="3" rx="1.5" fill="#4285F4" />
                <rect x="91" y="160" width="12" height="2" rx="1" fill="#EA4335" />
              </motion.g>

              {/* Head */}
              <motion.g
                animate={{ y: isRobotHovering ? [-4, 4, -4] : [-2, 2, -2], rotate: isRobotHovering ? [-4, 4, -4] : [-1, 1, -1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: '100px 80px' }}
              >
                {/* Mouse tracking parallax wrapper */}
                <motion.g style={{ x: headOffsetX, y: headOffsetY }}>
                  {/* Semi-circular android head */}
                  <path d="M 45 80 A 55 55 0 0 1 155 80 Z" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />

                  {/* ── Noogler Propeller Hat ── */}
                  <motion.g>
                    {/* Hat color wedges */}
                    <path d="M 70 30 A 30 30 0 0 1 130 30 Z" fill="#34A853" />
                    <path d="M 85 30 A 30 30 0 0 1 100 0 L 100 30 Z" fill="#EA4335" />
                    <path d="M 100 0 A 30 30 0 0 1 115 30 L 100 30 Z" fill="#FBBC05" />
                    <path d="M 70 30 A 30 30 0 0 1 85 30 L 100 30 Z" fill="#4285F4" />
                    
                    {/* Brim & Propeller Base */}
                    <rect x="63" y="27" width="74" height="6" rx="3" fill="#4285F4" />
                    <rect x="98" y="-10" width="4" height="13" fill="#F8F9FA" />
                    <circle cx="100" cy="-10" r="3.5" fill="#FBBC05" />

                    {/* Spinning Propeller Blades */}
                    <motion.g
                      animate={{ scaleX: [1, -1] }}
                      transition={{ duration: 0.25, repeat: Infinity, repeatType: 'reverse', ease: "linear" }}
                      style={{ transformOrigin: '100px -10px' }}
                    >
                      <ellipse cx="85" cy="-10" rx="14" ry="2.5" fill="#4285F4" opacity="0.9" />
                      <ellipse cx="115" cy="-10" rx="14" ry="2.5" fill="#EA4335" opacity="0.9" />
                    </motion.g>
                  </motion.g>

                  {/* Eyes Container */}
                  <motion.g style={{ x: eyesOffsetX, y: eyesOffsetY }}>
                    <motion.g
                      animate={isRobotHovering ? { x: [-2, 2, -2] } : { x: 0 }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {/* Solid Dark Eyes (High Visibility against white chassis) */}
                      <circle cx="80" cy="55" r="7.5" fill="#202124" />
                      <circle cx="120" cy="55" r="7.5" fill="#202124" />
                      
                      {/* Eye Shines */}
                      <circle cx="82" cy="53" r="2" fill="#FFFFFF" />
                      <circle cx="122" cy="53" r="2" fill="#FFFFFF" />
                      
                      {/* Blinking Animation for Eyes */}
                      <motion.g
                        animate={{ scaleY: [0, 0, 1, 0, 0] }}
                        transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
                        style={{ transformOrigin: '100px 55px' }}
                      >
                         {/* The blink overlay (skin-color) covers the eyes during a blink */}
                         <circle cx="80" cy="55" r="8.5" fill="#F8F9FA" />
                         <circle cx="120" cy="55" r="8.5" fill="#F8F9FA" />
                      </motion.g>
                    </motion.g>
                  </motion.g>
                </motion.g>
              </motion.g>

              {/* Soft glow hover effect underneath (Kept subtle for contrast) */}
              <motion.ellipse
                cx="100" cy="245" rx="40" ry="10"
                fill="#9AA0A6"
                animate={{ opacity: [0.1, 0.25, 0.1], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>

            {/* 💬 GDG Animated "< >" Logo Banner */}
            <motion.div
              className="absolute -top-[4.5rem] left-1/2 -translate-x-1/2 flex items-center justify-center z-50 pointer-events-none"
            >
              <motion.div
                layout
                className={[
                  'flex items-center justify-center rounded-full px-2 py-1.5 border-[1.5px] overflow-hidden pointer-events-auto transition-all duration-300 ease-in-out',
                  (isFlyingIn || isRobotHovering)
                    ? 'bg-white/20 backdrop-blur-md border-white/30 shadow-lg shadow-black/10'
                    : 'bg-transparent border-transparent',
                ].join(' ')}
              >
                {/* Left Bracket */}
                <motion.div
                  layout
                  animate={{
                    x: (isFlyingIn || isRobotHovering) ? 0 : 4,
                    scale: (isFlyingIn || isRobotHovering) ? 1 : 0.95,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="flex-shrink-0 z-10 drop-shadow-sm"
                >
                  <svg width="24" height="32" viewBox="0 0 40 50" fill="none">
                    <line x1="32" y1="8" x2="10" y2="25" stroke="#EA4335" strokeWidth="12" strokeLinecap="round" />
                    <line x1="10" y1="25" x2="32" y2="42" stroke="#4285F4" strokeWidth="12" strokeLinecap="round" />
                  </svg>
                </motion.div>

                {/* Expanding Message Content */}
                <motion.div
                  layout
                  animate={{
                    width: (isFlyingIn || isRobotHovering) ? 'auto' : 0,
                    opacity: (isFlyingIn || isRobotHovering) ? 1 : 0,
                    paddingLeft: (isFlyingIn || isRobotHovering) ? 12 : 0,
                    paddingRight: (isFlyingIn || isRobotHovering) ? 14 : 0,
                  }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="overflow-hidden z-0"
                >
                  <div className="w-[168px] relative flex items-center min-h-[32px]">
                    {/* Greeting message (Only visible when flying in and NOT being actively hovered) */}
                    <div 
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                        isFlyingIn && !isRobotHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <p className="text-gray-800 font-bold text-[12px] leading-snug w-full text-center">
                        Hello there! 👋 Hover on me ✨
                      </p>
                    </div>

                    {/* Announcement message (Only visible when actively hovered) */}
                    <div 
                      className={`w-full transition-opacity duration-300 ${
                        isRobotHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <span className="text-gray-400 text-[9px] font-black uppercase tracking-[0.18em] block mb-0.5">Announcement</span>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-800 font-bold text-[12px] leading-snug flex-1">
                          {announcement}
                        </p>
                        <Link
                          href="/events"
                          className="bg-[#EA4335]/10 text-[#EA4335] hover:bg-[#EA4335] hover:text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-md transition-colors whitespace-nowrap"
                        >
                          Events →
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Right Bracket */}
                <motion.div
                  layout
                  animate={{
                    x: (isFlyingIn || isRobotHovering) ? 0 : -4,
                    scale: (isFlyingIn || isRobotHovering) ? 1 : 0.95,
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                  className="flex-shrink-0 z-10 drop-shadow-sm"
                >
                  <svg width="24" height="32" viewBox="0 0 40 50" fill="none">
                    <line x1="8" y1="8" x2="30" y2="25" stroke="#34A853" strokeWidth="12" strokeLinecap="round" />
                    <line x1="30" y1="25" x2="8" y2="42" stroke="#FBBC05" strokeWidth="12" strokeLinecap="round" />
                  </svg>
                </motion.div>
              </motion.div>
            </motion.div>

          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
