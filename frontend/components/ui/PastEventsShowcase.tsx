'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { useGSAP } from '@gsap/react';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'], weight: ['400', '700'] });

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

if (typeof window !== 'undefined') {
  gsap.registerPlugin(Draggable);
}

type FeaturedEvent = {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  category: string | null;
};

interface PastEventsShowcaseProps {
  events: FeaturedEvent[];
}

export default function PastEventsShowcase({ events }: PastEventsShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef    = useRef<HTMLUListElement>(null);
  const proxyRef    = useRef<HTMLDivElement>(null);
  const textRef     = useRef<HTMLDivElement>(null);
  const loopRef     = useRef<gsap.core.Timeline | null>(null);

  // Single source of truth for carousel position
  const playheadRef   = useRef({ offset: 0 });
  const navTweenRef   = useRef<gsap.core.Tween | null>(null);
  const syncLoopRef   = useRef<((offset: number) => void) | null>(null);
  const activeIndexRef = useRef(0);

  const MIN_ITEMS = 12;
  const duplicateFactor = events.length > 0 ? Math.ceil(MIN_ITEMS / events.length) : 1;
  const displayEvents = events.length > 0
    ? Array.from({ length: events.length * duplicateFactor }).map((_, i) => events[i % events.length])
    : [];

  // Text reveal on card change
  useEffect(() => {
    setIsExpanded(false);
    if (textRef.current) {
      const children = textRef.current.children;
      gsap.killTweensOf(children);
      gsap.fromTo(
        children,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)', overwrite: true }
      );
    }
  }, [activeIndex]);

  const spacing   = 0.1;
  const snapTime  = gsap.utils.snap(spacing);

  function buildSeamlessLoop(
    items: HTMLElement[],
    sp: number,
    animateFunc: (el: HTMLElement) => gsap.core.Timeline
  ) {
    const rawSequence  = gsap.timeline({ paused: true });
    const seamlessLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() {
        // @ts-ignore
        this._time === this._dur && (this._tTime += this._dur - 0.01);
      },
    });
    const cycleDuration = sp * items.length;
    let dur = 0;

    items.concat(items).concat(items).forEach((item, i) => {
      const anim = animateFunc(items[i % items.length]);
      rawSequence.add(anim, i * sp);
      if (!dur) dur = anim.duration();
    });

    seamlessLoop.fromTo(
      rawSequence,
      { time: cycleDuration + dur / 2 },
      { time: `+=${cycleDuration}`, duration: cycleDuration, ease: 'none' }
    );
    return seamlessLoop;
  }

  useGSAP(() => {
    if (!containerRef.current || !cardsRef.current || displayEvents.length === 0) return;

    const cards = gsap.utils.toArray('li', cardsRef.current) as HTMLElement[];
    gsap.set(cards, { xPercent: 400, opacity: 0, scale: 0 });

    const animateFunc = (element: HTMLElement) => {
      const tl = gsap.timeline();
      tl.fromTo(
        element,
        { scale: 0.65, opacity: 0.2 },
        { scale: 1, opacity: 1, zIndex: 100, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.in', immediateRender: false }
      ).fromTo(
        element,
        { xPercent: 400 },
        { xPercent: -400, duration: 1, ease: 'none', immediateRender: false },
        0
      );
      return tl;
    };

    const seamlessLoop = buildSeamlessLoop(cards, spacing, animateFunc);
    loopRef.current    = seamlessLoop;

    const playhead   = playheadRef.current;
    const wrapTime   = gsap.utils.wrap(0, seamlessLoop.duration());
    const totalItems = displayEvents.length;

    function syncLoop(offset: number) {
      const time         = wrapTime(offset);
      seamlessLoop.time(time);
      const rawIndex     = Math.round(time / spacing);
      const wrappedIndex = ((rawIndex % totalItems) + totalItems) % totalItems;
      const originalIndex = wrappedIndex % events.length;
      if (activeIndexRef.current !== originalIndex) {
        activeIndexRef.current = originalIndex;
        setActiveIndex(originalIndex);
      }
    }

    // Expose syncLoop to navigate() without closure issues
    syncLoopRef.current = syncLoop;

    const draggables = Draggable.create(proxyRef.current, {
      type: 'x',
      trigger: containerRef.current,
      onPress() {
        // Kill any in-progress snap/nav tween so drag feels immediately responsive
        navTweenRef.current?.kill();
        this.startOffset = playhead.offset;
      },
      onDrag() {
        // Drive the loop 1-to-1 with finger — no tween in between, perfectly smooth
        playhead.offset = this.startOffset + (this.startX - this.x) * 0.00055;
        syncLoop(playhead.offset);
      },
      onDragEnd() {
        // Snap to nearest card with a short ease
        const snapped = snapTime(playhead.offset);
        navTweenRef.current = gsap.to(playhead, {
          offset: snapped,
          duration: 0.4,
          ease: 'power2.out',
          onUpdate: () => syncLoop(playhead.offset),
        });
      },
    });

    syncLoop(0);

    return () => {
      seamlessLoop.kill();
      navTweenRef.current?.kill();
      draggables[0]?.kill();
    };
  }, { dependencies: [displayEvents.length], scope: containerRef });

  // Arrow / keyboard navigation — animates playhead directly, no invalidate/restart
  const navigate = useCallback(
    (direction: number) => {
      const playhead     = playheadRef.current;
      const targetOffset = snapTime(playhead.offset + direction * spacing);
      navTweenRef.current?.kill();
      navTweenRef.current = gsap.to(playhead, {
        offset: targetOffset,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => syncLoopRef.current?.(playhead.offset),
      });
    },
    [spacing, snapTime]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  if (!events.length) {
    return (
      <section className="relative bg-slate-950 text-white overflow-hidden flex flex-col justify-center items-center py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/80 to-indigo-950/60" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mb-10">
          <div className="h-1.5 w-16 flex mb-4 overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] ${antonio.className}`}>
            Showcase
          </h2>
          <p className="mt-6 text-base md:text-lg text-white/60 leading-relaxed">
            Relive the highlights from our past events and community milestones.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 bg-[#FBBC05] border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-[6px_6px_0_rgba(0,0,0,0.4)] rotate-3">
            <Sparkles className="w-10 h-10 text-slate-900" />
          </div>
          <h3 className={`text-4xl font-black text-white uppercase tracking-tight leading-none mb-4 ${antonio.className}`}>
            Nothing Here Yet
          </h3>
          <p className="text-gray-400 font-bold text-sm leading-relaxed max-w-xs">
            We haven&apos;t featured any past events yet. Our best moments are coming soon!
          </p>
          <div className="mt-8 flex gap-2">
            {GOOGLE_COLORS.map((c, i) => (
              <div
                key={c}
                className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{ backgroundColor: c, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const currentEvent = events[activeIndex];
  const activeColor  = GOOGLE_COLORS[activeIndex % GOOGLE_COLORS.length];

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col justify-center select-none py-20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/80 to-indigo-950/60" />

      {/* Invisible drag proxy */}
      <div ref={proxyRef} className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 flex flex-col w-full h-full">

        {/* Section Header */}
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mb-8 md:mb-10">
          <div className="h-1.5 w-16 flex mb-4 overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] ${antonio.className}`}>
            Showcase
          </h2>
          <p className="mt-6 text-base md:text-lg text-white/60 leading-relaxed">
            Relive the highlights from our past events and community milestones.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative w-full cursor-grab active:cursor-grabbing flex items-center justify-center py-6">
          <ul ref={cardsRef} className="cards relative w-[85vw] sm:w-[500px] md:w-[640px] lg:w-[750px] aspect-[16/9] list-none p-0 m-0">
            {displayEvents.map((event, idx) => {
              const realIdx    = idx % events.length;
              const isActiveCard = realIdx === activeIndex;
              const color      = GOOGLE_COLORS[realIdx % GOOGLE_COLORS.length];
              return (
                <li
                  key={`showcase-card-${idx}`}
                  className="absolute inset-0 overflow-hidden bg-slate-900 group"
                  style={{
                    borderRadius: '1.5rem',
                    border: '3px solid #1e293b',
                    boxShadow: isActiveCard
                      ? `4px 4px 0 ${color}, 0 16px 40px -10px ${color}40`
                      : '4px 4px 0 rgba(15, 23, 42, 0.8)',
                  }}
                >
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className={`w-full h-full object-cover transition-all duration-500 ${isActiveCard ? '' : 'grayscale'}`}
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${color}30 0%, #0f172a 100%)` }}
                    >
                      <Sparkles className="w-20 h-20 text-white/5" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Info & Controls */}
        <div className="w-full max-w-[85vw] sm:max-w-[500px] md:max-w-[640px] lg:max-w-[750px] mx-auto px-0 mt-4 md:mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-12">

            {/* Event details */}
            <div className="flex-1 min-w-0">
              <div ref={textRef} className="space-y-3">
                <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-[0.9] ${antonio.className}`}>
                  {currentEvent?.title}
                </h3>

                <div className="max-w-xl">
                  <p className={`text-gray-400 text-xs sm:text-sm font-medium leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {currentEvent?.description || 'Celebrating another milestone in our technical journey at GDGOC-UITU Karachi.'}
                  </p>
                  {((currentEvent?.description?.length || 0) > 100) && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="mt-1.5 text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-wider transition-colors"
                    >
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4">
                  {currentEvent?.event_date && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <Calendar className="w-4 h-4" />
                      {new Date(currentEvent.event_date).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {currentEvent?.category && (
                    <span
                      className="px-3 py-1 text-[9px] font-black text-white uppercase tracking-[0.15em] rounded-full border-2 border-slate-900 shadow-[3px_3px_0_#0f172a]"
                      style={{ backgroundColor: GOOGLE_COLORS[activeIndex % GOOGLE_COLORS.length] }}
                    >
                      {currentEvent.category}
                    </span>
                  )}
                  <Link
                    href="/events?status=past"
                    className="px-6 py-2 bg-white text-slate-950 border-[3px] border-slate-900 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#4285F4] hover:text-white hover:border-slate-900 transition-all shadow-[4px_4px_0_rgba(255,255,255,0.08)] hover:shadow-[4px_4px_0_#0f172a] active:translate-y-1 active:shadow-none"
                  >
                    Explore All Showcases
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center gap-5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-lg sm:text-xl font-black tabular-nums ${antonio.className}`}
                  style={{ color: activeColor }}
                >
                  {String(activeIndex + 1).padStart(2, '0')}
                </span>
                <div className="w-6 h-[2px] bg-white/15" />
                <span className={`text-lg sm:text-xl font-black text-white/20 tabular-nums ${antonio.className}`}>
                  {String(events.length).padStart(2, '0')}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-white/15 hover:border-white hover:bg-white/5 transition-all active:scale-90 z-20"
                  aria-label="Previous showcase"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(1)}
                  className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-white/15 hover:border-white hover:bg-white/5 transition-all active:scale-90 z-20"
                  aria-label="Next showcase"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Title ticker */}
          <div className="mt-5 md:mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm">
              {events.map((event, idx) => (
                <span key={event.id} className="flex items-center gap-3">
                  {idx > 0 && <span className="text-white/10 font-light">/</span>}
                  <span
                    className={`transition-all duration-500 cursor-default ${
                      idx === activeIndex
                        ? `font-black uppercase tracking-widest text-base ${antonio.className}`
                        : 'font-medium text-white/20 hover:text-white/40'
                    }`}
                    style={idx === activeIndex ? { color: activeColor } : undefined}
                  >
                    {event.title}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
