'use client';

import { useEffect, useRef } from 'react';

/**
 * A decorative, full-width image pinned to the top of its parent section that
 * drifts slowly downward as the user scrolls — finishing at the section's bottom.
 * The travel equals (section height − image height) spread across the whole
 * section scroll, so it always moves much slower than the content and never
 * spills outside the section.
 */
export default function ParallaxBackdrop({
  src,
  className = '',
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 as the section enters the viewport bottom, 1 as it leaves the top.
      const progress = (vh - rect.top) / (vh + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      // Move only within the section: from the top (0) to its bottom (maxShift).
      const maxShift = Math.max(0, section.offsetHeight - el.offsetHeight);
      el.style.transform = `translate3d(0, ${clamped * maxShift}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    el.addEventListener('load', update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('load', update);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none select-none absolute top-0 left-0 w-full h-auto will-change-transform ${className}`}
    />
  );
}
