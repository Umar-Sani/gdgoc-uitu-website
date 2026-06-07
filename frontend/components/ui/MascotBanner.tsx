'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function MascotBanner({ announcement }: { announcement: string | null }) {
  // ─── State ────────────────────────────────────────────────────────────────────
  const [hasHovered, setHasHovered] = useState(false);
  const [isFlyingIn, setIsFlyingIn] = useState(true);
  const [isRobotHovering, setIsRobotHovering] = useState(false);

  // ─── HTML element refs ────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const speechContentRef = useRef<HTMLDivElement>(null);
  const leftBracketRef = useRef<HTMLDivElement>(null);
  const rightBracketRef = useRef<HTMLDivElement>(null);

  // ─── SVG element refs ─────────────────────────────────────────────────────────
  const antennaLeftRef = useRef<SVGLineElement>(null);
  const antennaRightRef = useRef<SVGLineElement>(null);
  const armLeftRef = useRef<SVGGElement>(null);
  const armRightRef = useRef<SVGGElement>(null);
  const legLeftRef = useRef<SVGGElement>(null);
  const legRightRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const headGroupRef = useRef<SVGGElement>(null);
  const headParallaxRef = useRef<SVGGElement>(null);
  const eyesParallaxRef = useRef<SVGGElement>(null);
  const eyesMoveRef = useRef<SVGGElement>(null);
  const blinkRef = useRef<SVGGElement>(null);
  const propellerRef = useRef<SVGGElement>(null);
  const glowRef = useRef<SVGEllipseElement>(null);

  // ─── QuickTo refs for smooth mouse parallax ───────────────────────────────────
  const quickHeadX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickHeadY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickEyesX = useRef<ReturnType<typeof gsap.quickTo> | null>(null);
  const quickEyesY = useRef<ReturnType<typeof gsap.quickTo> | null>(null);

  // Refs so mouse handler always reads current state without re-registering
  const hasHoveredRef = useRef(false);
  const isRobotHoveringRef = useRef(false);
  useEffect(() => { hasHoveredRef.current = hasHovered; }, [hasHovered]);
  useEffect(() => { isRobotHoveringRef.current = isRobotHovering; }, [isRobotHovering]);

  // ─── Mouse parallax tracking ──────────────────────────────────────────────────
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = (e.clientY / window.innerHeight) * 2 - 1;
      const factor = hasHoveredRef.current
        ? (isRobotHoveringRef.current ? 1.0 : 0.6)
        : 0.2;
      const tx = mx * factor;
      const ty = Math.min(my * factor, 0.5);
      quickHeadX.current?.(tx * 6);
      quickHeadY.current?.(ty * 8);
      quickEyesX.current?.(tx * 12);
      quickEyesY.current?.(ty * 16);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ─── Static / permanent GSAP animations ──────────────────────────────────────
  useGSAP(() => {
    if (!announcement) return;

    // Set SVG transform origins (svgOrigin = absolute SVG coordinate space)
    gsap.set(antennaLeftRef.current,  { svgOrigin: '70 45'  });
    gsap.set(antennaRightRef.current, { svgOrigin: '130 45' });
    gsap.set(armLeftRef.current,      { svgOrigin: '35 92'  });
    gsap.set(armRightRef.current,     { svgOrigin: '165 96' });
    gsap.set(legLeftRef.current,      { svgOrigin: '79 184' });
    gsap.set(legRightRef.current,     { svgOrigin: '121 184' });
    gsap.set(bodyRef.current,         { svgOrigin: '100 180' });
    gsap.set(headGroupRef.current,    { svgOrigin: '100 80'  });
    gsap.set(propellerRef.current,    { svgOrigin: '100 -10' });
    gsap.set(blinkRef.current,        { svgOrigin: '100 55', scaleY: 0 });

    // Initial speech-bubble state (collapsed)
    gsap.set(speechContentRef.current, { width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 });
    gsap.set(leftBracketRef.current,   { x: 4,  scale: 0.95 });
    gsap.set(rightBracketRef.current,  { x: -4, scale: 0.95 });

    // Set up quickTo for parallax smoothing
    quickHeadX.current  = gsap.quickTo(headParallaxRef.current,  'x', { duration: 0.6, ease: 'power2.out' });
    quickHeadY.current  = gsap.quickTo(headParallaxRef.current,  'y', { duration: 0.6, ease: 'power2.out' });
    quickEyesX.current  = gsap.quickTo(eyesParallaxRef.current,  'x', { duration: 0.4, ease: 'power2.out' });
    quickEyesY.current  = gsap.quickTo(eyesParallaxRef.current,  'y', { duration: 0.4, ease: 'power2.out' });

    // Entrance
    gsap.from(containerRef.current, {
      opacity: 0, y: 15, scale: 0.95, duration: 1.5, ease: 'power2.out',
      onComplete: () => setTimeout(() => setIsFlyingIn(false), 2000),
    });

    // Continuous float bob
    gsap.fromTo(floatRef.current, { y: -6 }, {
      y: 6, duration: 1.75, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    // Body breathe
    gsap.to(bodyRef.current, {
      scaleY: 1.02, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    // Propeller flip
    gsap.fromTo(propellerRef.current, { scaleX: 1 }, {
      scaleX: -1, duration: 0.25, repeat: -1, yoyo: true, ease: 'none',
    });

    // Legs
    gsap.fromTo(legLeftRef.current, { y: -3, rotate: -4 }, {
      y: 3, rotate: 4, duration: 1.9, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
    gsap.fromTo(legRightRef.current, { y: 3, rotate: 4 }, {
      y: -3, rotate: -4, duration: 2.05, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.3,
    });

    // Right arm gentle sway
    gsap.fromTo(armRightRef.current, { rotate: 10 }, {
      rotate: -5, duration: 2.25, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.5,
    });

    // Glow pulse
    gsap.fromTo(glowRef.current, { opacity: 0.1, scale: 0.8 }, {
      opacity: 0.25, scale: 1.1, duration: 1.75, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });

    // Blink timeline
    gsap.timeline({ repeat: -1 })
      .set(blinkRef.current,  { scaleY: 0 })
      .to(blinkRef.current,   { duration: 1.8 })          // hold open
      .to(blinkRef.current,   { scaleY: 1, duration: 0.08 }) // close
      .to(blinkRef.current,   { scaleY: 0, duration: 0.08 }) // open
      .to(blinkRef.current,   { duration: 1.8 });          // hold open

  }, { scope: containerRef, dependencies: [!!announcement] });

  // ─── Hover-state-dependent animations ────────────────────────────────────────
  useEffect(() => {
    if (!announcement) return;

    gsap.killTweensOf([
      antennaLeftRef.current, antennaRightRef.current,
      armLeftRef.current, headGroupRef.current, eyesMoveRef.current,
    ]);

    if (isRobotHovering) {
      gsap.fromTo(antennaLeftRef.current, { rotate: -8 }, { rotate: 8, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.fromTo(antennaRightRef.current, { rotate: 8 }, { rotate: -8, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.2 });
      gsap.to(armLeftRef.current, { rotate: -10, duration: 0.3, ease: 'back.out(2)' });
      gsap.fromTo(headGroupRef.current, { y: -4, rotate: -4 }, { y: 4, rotate: 4, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.fromTo(eyesMoveRef.current, { x: -2 }, { x: 2, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    } else {
      gsap.fromTo(antennaLeftRef.current, { rotate: -2 }, { rotate: 2, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.fromTo(antennaRightRef.current, { rotate: 2 }, { rotate: -2, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.2 });
      gsap.fromTo(armLeftRef.current, { rotate: 130 }, { rotate: 80, duration: 0.75, repeat: -1, yoyo: true, ease: 'power1.inOut' });
      gsap.fromTo(headGroupRef.current, { y: -2, rotate: -1 }, { y: 2, rotate: 1, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to(eyesMoveRef.current, { x: 0, duration: 0.3 });
    }
  }, [isRobotHovering, announcement]);

  // ─── Speech bubble open / close ───────────────────────────────────────────────
  useEffect(() => {
    if (!announcement) return;
    const show = isFlyingIn || isRobotHovering;

    if (show) {
      gsap.to(speechContentRef.current, { width: 194, opacity: 1, paddingLeft: 12, paddingRight: 14, duration: 0.4, ease: 'power2.inOut' });
      gsap.to(leftBracketRef.current,   { x: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
      gsap.to(rightBracketRef.current,  { x: 0, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
    } else {
      gsap.to(speechContentRef.current, { width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0, duration: 0.4, ease: 'power2.inOut' });
      gsap.to(leftBracketRef.current,   { x: 4,  scale: 0.95, duration: 0.4, ease: 'power2.inOut' });
      gsap.to(rightBracketRef.current,  { x: -4, scale: 0.95, duration: 0.4, ease: 'power2.inOut' });
    }
  }, [isFlyingIn, isRobotHovering, announcement]);

  // ─── Early return (after all hooks) ──────────────────────────────────────────
  if (!announcement) return null;

  const showBubble = isFlyingIn || isRobotHovering;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="fixed bottom-8 right-24 z-50 hidden md:block">
      <div ref={floatRef}>
        <button
          type="button"
          onMouseEnter={() => { setHasHovered(true); setIsRobotHovering(true); }}
          onMouseLeave={() => setIsRobotHovering(false)}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="relative p-0 border-0 bg-transparent shadow-none active:scale-95 transition-transform"
        >
          {/* ── SVG Mascot ── */}
          <svg className="w-20 h-28 md:w-24 md:h-32 overflow-visible" viewBox="0 -20 200 260" fill="none">
            <line ref={antennaLeftRef}  x1="70" y1="45" x2="52" y2="15"  stroke="#BDC1C6" strokeWidth="6" strokeLinecap="round" />
            <line ref={antennaRightRef} x1="130" y1="45" x2="148" y2="15" stroke="#BDC1C6" strokeWidth="6" strokeLinecap="round" />

            {/* Left arm */}
            <g ref={armLeftRef}>
              <rect x="21" y="78" width="28" height="85" rx="14" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
            </g>

            {/* Right arm + laptop */}
            <g ref={armRightRef}>
              <rect x="151" y="82" width="28" height="85" rx="14" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
              <g transform="translate(135, 120) rotate(-15)">
                <rect x="0" y="0" width="60" height="38" rx="4" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="2.5" />
                <line x1="0" y1="34" x2="60" y2="34" stroke="#DADCE0" strokeWidth="2.5" />
                <circle cx="20" cy="17" r="3" fill="#4285F4" />
                <circle cx="28" cy="17" r="3" fill="#EA4335" />
                <circle cx="36" cy="17" r="3" fill="#FBBC05" />
                <circle cx="44" cy="17" r="3" fill="#34A853" />
              </g>
            </g>

            {/* Legs */}
            <g ref={legLeftRef}>
              <rect x="65" y="170" width="28" height="60" rx="14" fill="#E8EAED" stroke="#BDC1C6" strokeWidth="4" />
            </g>
            <g ref={legRightRef}>
              <rect x="107" y="170" width="28" height="60" rx="14" fill="#E8EAED" stroke="#BDC1C6" strokeWidth="4" />
            </g>

            {/* Body + badge */}
            <g ref={bodyRef}>
              <rect x="45" y="85" width="110" height="95" rx="20" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />
              <path d="M 47 94 Q 100 85 153 94 L 153 98 L 47 98 Z" fill="#E8EAED" />
              <path d="M 65 95 L 94 135"  stroke="#3C4043" strokeWidth="2.5" />
              <path d="M 135 95 L 106 135" stroke="#3C4043" strokeWidth="2.5" />
              <rect x="85" y="130" width="30" height="40" rx="3" fill="#FFFFFF" stroke="#DADCE0" strokeWidth="1.5" />
              <rect x="91" y="135" width="18" height="15" rx="2" fill="#E8EAED" />
              <circle cx="100" cy="141" r="4" fill="#BDBDBD" />
              <path d="M 94 150 Q 100 145 106 150" stroke="#BDBDBD" strokeWidth="2" fill="none" />
              <rect x="91" y="154" width="18" height="3" rx="1.5" fill="#4285F4" />
              <rect x="91" y="160" width="12" height="2" rx="1" fill="#EA4335" />
            </g>

            {/* Head outer (bobs) */}
            <g ref={headGroupRef}>
              {/* Head parallax (follows mouse) */}
              <g ref={headParallaxRef}>
                <path d="M 45 80 A 55 55 0 0 1 155 80 Z" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="4" />

                {/* Noogler hat */}
                <path d="M 70 30 A 30 30 0 0 1 130 30 Z" fill="#34A853" />
                <path d="M 85 30 A 30 30 0 0 1 100 0 L 100 30 Z" fill="#EA4335" />
                <path d="M 100 0 A 30 30 0 0 1 115 30 L 100 30 Z" fill="#FBBC05" />
                <path d="M 70 30 A 30 30 0 0 1 85 30 L 100 30 Z" fill="#4285F4" />
                <rect x="63" y="27" width="74" height="6" rx="3" fill="#4285F4" />
                <rect x="98" y="-10" width="4" height="13" fill="#F8F9FA" />
                <circle cx="100" cy="-10" r="3.5" fill="#FBBC05" />
                {/* Propeller blades */}
                <g ref={propellerRef}>
                  <ellipse cx="85"  cy="-10" rx="14" ry="2.5" fill="#4285F4" opacity="0.9" />
                  <ellipse cx="115" cy="-10" rx="14" ry="2.5" fill="#EA4335" opacity="0.9" />
                </g>

                {/* Eyes parallax (follows mouse, deeper) */}
                <g ref={eyesParallaxRef}>
                  <g ref={eyesMoveRef}>
                    <circle cx="80"  cy="55" r="7.5" fill="#202124" />
                    <circle cx="120" cy="55" r="7.5" fill="#202124" />
                    <circle cx="82"  cy="53" r="2"   fill="#FFFFFF" />
                    <circle cx="122" cy="53" r="2"   fill="#FFFFFF" />
                    {/* Blink overlay */}
                    <g ref={blinkRef}>
                      <circle cx="80"  cy="55" r="8.5" fill="#F8F9FA" />
                      <circle cx="120" cy="55" r="8.5" fill="#F8F9FA" />
                    </g>
                  </g>
                </g>
              </g>
            </g>

            {/* Drop shadow glow */}
            <ellipse ref={glowRef} cx="100" cy="245" rx="40" ry="10" fill="#9AA0A6" />
          </svg>

          {/* ── Speech bubble ── */}
          <div className="absolute -top-[4.5rem] left-1/2 -translate-x-1/2 flex items-center justify-center z-50 pointer-events-none">
            <div
              className={`flex items-center justify-center rounded-full px-2 py-1.5 border-[1.5px] overflow-hidden pointer-events-auto transition-[background-color,border-color,box-shadow] duration-300 ease-in-out ${
                showBubble
                  ? 'bg-white/20 backdrop-blur-md border-white/30 shadow-lg shadow-black/10'
                  : 'bg-transparent border-transparent'
              }`}
            >
              {/* Left bracket */}
              <div ref={leftBracketRef} className="flex-shrink-0 z-10 drop-shadow-sm">
                <svg width="24" height="32" viewBox="0 0 40 50" fill="none">
                  <line x1="32" y1="8"  x2="10" y2="25" stroke="#EA4335" strokeWidth="12" strokeLinecap="round" />
                  <line x1="10" y1="25" x2="32" y2="42" stroke="#4285F4" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </div>

              {/* Expanding content */}
              <div ref={speechContentRef} className="overflow-hidden z-0">
                <div className="w-[168px] relative flex items-center min-h-[32px]">
                  {/* Greeting */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isFlyingIn && !isRobotHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <p className="text-gray-800 font-bold text-[12px] leading-snug w-full text-center">
                      Hello there! 👋 Hover on me ✨
                    </p>
                  </div>
                  {/* Announcement */}
                  <div className={`w-full transition-opacity duration-300 ${isRobotHovering ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <span className="text-gray-400 text-[9px] font-black uppercase tracking-[0.18em] block mb-0.5">Announcement</span>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-800 font-bold text-[12px] leading-snug flex-1">{announcement}</p>
                      <Link
                        href="/events"
                        className="bg-[#EA4335]/10 text-[#EA4335] hover:bg-[#EA4335] hover:text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-1 rounded-md transition-colors whitespace-nowrap"
                      >
                        Events →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right bracket */}
              <div ref={rightBracketRef} className="flex-shrink-0 z-10 drop-shadow-sm">
                <svg width="24" height="32" viewBox="0 0 40 50" fill="none">
                  <line x1="8"  y1="8"  x2="30" y2="25" stroke="#34A853" strokeWidth="12" strokeLinecap="round" />
                  <line x1="30" y1="25" x2="8"  y2="42" stroke="#FBBC05" strokeWidth="12" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
