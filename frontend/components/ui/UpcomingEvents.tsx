'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Antonio } from 'next/font/google';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Clock,
  Users,
  Ticket,
  Sparkles,
} from 'lucide-react';

const antonio = Antonio({ subsets: ['latin'] });

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Event = {
  event_id: string;
  title: string;
  event_type: string;
  category_name: string;
  start_datetime: string;
  end_datetime: string;
  venue: string | null;
  is_free: boolean;
  ticket_price: number | null;
  seats_available: number;
  fill_percentage: number;
  banner_url: string | null;
  description: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Google Colors ────────────────────────────────────────────────────────────

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpcomingEvents({
  events,
  featuredEvent,
}: {
  events: Event[];
  featuredEvent: Event | null;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const titleWordsRef = useRef<HTMLHeadingElement>(null);

  const [expandedEvent, setExpandedEvent] = useState<Event | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const combinedEvents = [
    ...(featuredEvent ? [featuredEvent] : []),
    ...events,
  ].filter(
    (e, idx, self) =>
      self.findIndex((t) => t.event_id === e.event_id) === idx
  );

  // ── Scroll-triggered entrance for the cards view ──
  useGSAP(
    () => {
      if (!sectionRef.current || expandedEvent) return;

      // Make sure cards are visible first, then animate
      gsap.set('.event-card', { clearProps: 'all' });
      gsap.set('.cta-card', { clearProps: 'all' });

      // Stagger-in the cards
      const cards = gsap.utils.toArray('.event-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 80, opacity: 0, scale: 0.92 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.12,
            ease: 'back.out(1.4)',
            duration: 0.8,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }

      // Stagger-in the CTA cards
      const ctas = gsap.utils.toArray('.cta-card');
      if (ctas.length > 0) {
        gsap.fromTo(
          ctas,
          { y: 60, opacity: 0, scale: 0.95 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.1,
            ease: 'power3.out',
            duration: 0.7,
            delay: 0.3,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 85%',
              once: true,
            },
          }
        );
      }
    },
    { scope: sectionRef, dependencies: [combinedEvents.length, expandedEvent] }
  );

  // ── Expand an event into full-screen detail ──
  const expandEvent = useCallback(
    (event: Event) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setExpandedEvent(event);

      // Lock body scroll
      document.body.style.overflow = 'hidden';

      // Wait for React to render the expanded view, then animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const tl = gsap.timeline({
            onComplete: () => setIsAnimating(false),
          });

          // Popup container scale in
          tl.fromTo(
            '.expanded-content',
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
          );

          // Background fade in
          tl.fromTo(
            '.expanded-bg',
            { opacity: 0, scale: 1.1 },
            { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.out' },
            '<'
          );

          // Dark overlay
          tl.fromTo(
            '.expanded-overlay',
            { opacity: 0 },
            { opacity: 1, duration: 0.4, ease: 'power2.out' },
            '<0.1'
          );

          // Title words: split and animate each word
          if (titleWordsRef.current) {
            const split = new SplitText(titleWordsRef.current, {
              type: 'words',
              tag: 'span',
            });
            tl.fromTo(
              split.words,
              { y: 60, opacity: 0, rotationX: -40 },
              {
                y: 0,
                opacity: 1,
                rotationX: 0,
                stagger: 0.1,
                duration: 0.6,
                ease: 'back.out(1.2)',
              },
              '-=0.3'
            );
          }

          // Tags
          tl.fromTo(
            '.expanded-tag',
            { x: -30, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              stagger: 0.08,
              duration: 0.4,
              ease: 'power3.out',
            },
            '<0.1'
          );

          // Right column (description)
          tl.fromTo(
            '.expanded-right',
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
            '<0.1'
          );

          // Back button
          tl.fromTo(
            '.back-button',
            { y: -30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
            '<0.1'
          );

          // Detail link
          tl.fromTo(
            '.detail-link',
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
            '<0.1'
          );
        });
      });
    },
    [isAnimating]
  );

  // ── Collapse back to cards ──
  const collapseEvent = useCallback(() => {
    // Kill ALL running tweens on expanded elements to prevent stale state
    gsap.killTweensOf([
      '.expanded-bg',
      '.expanded-overlay',
      '.expanded-content',
      '.back-button',
      '.expanded-tag',
      '.expanded-right',
      '.detail-link',
    ]);

    // Immediately close - no animation dependency
    setExpandedEvent(null);
    setIsAnimating(false);
    document.body.style.overflow = '';
  }, []);

  // ── Escape key to close ──
  useEffect(() => {
    if (!expandedEvent) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapseEvent();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [expandedEvent, collapseEvent]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen bg-[#F4F4F0] overflow-hidden border-b-[3px] border-slate-900"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:100px_100px] z-0" />

      {/* ── CARDS VIEW ── */}
      <div
        ref={cardsContainerRef}
        className={`relative z-10 transition-opacity duration-300 ${expandedEvent ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div>
              <div className="h-1.5 w-20 flex mb-4 overflow-hidden">
                {GOOGLE_COLORS.map((c) => (
                  <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
              <h2
                className={`text-5xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85] ${antonio.className}`}
              >
                <span className="text-[#4285F4]">UPCOMING</span>
                <br />
                <span className="text-slate-900">EVENTS</span>
              </h2>
            </div>

            <p className="text-gray-600 text-lg sm:text-xl font-bold tracking-tight max-w-sm lg:text-right lg:mb-4 lg:self-end">
              Don&apos;t miss out on the most impactful technical sessions in the
              city.
            </p>
          </div>

          {/* Event Cards Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${combinedEvents.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2 lg:max-w-5xl lg:mx-auto'}`}>
            {combinedEvents.length > 0 ? (
              combinedEvents.map((event, idx) => {
                const color = GOOGLE_COLORS[idx % GOOGLE_COLORS.length];
                const isFeatured = idx === 0;

                return (
                  <button
                    key={event.event_id}
                    onClick={() => expandEvent(event)}
                    className={`event-card group text-left relative overflow-hidden transition-all duration-300 cursor-pointer 
                      border-[3px] border-slate-900 rounded-[2rem] shadow-[8px_8px_0_#0f172a] hover:shadow-[4px_4px_0_#0f172a] hover:-translate-y-2 hover:translate-x-1
                      ${
                        isFeatured
                          ? 'col-span-1 md:col-span-2 lg:col-span-3 aspect-[16/10] md:aspect-[21/9] bg-slate-950'
                          : 'aspect-[16/10] bg-slate-900'
                      }`}
                  >
                    {/* Image Background */}
                    <div className="absolute inset-0">
                      {event.banner_url ? (
                        <img
                          src={event.banner_url}
                          alt={event.title}
                          className="w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-50 transition-all duration-700"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${color} 0%, ${color}88 50%, #0f172a 100%)`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Top Elements */}
                    <div
                      className={`absolute top-5 left-5 right-5 flex justify-between items-start z-10 ${isFeatured ? 'md:top-8 md:left-8 md:right-8' : ''}`}
                    >
                      <div className="flex flex-col gap-3">
                        <span
                          className={`px-3 py-1 text-white text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-slate-900 shadow-[2px_2px_0_#0f172a] w-fit`}
                          style={{ backgroundColor: color }}
                        >
                          {event.category_name || 'General'}
                        </span>
                        {isFeatured && (
                          <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-slate-900 rounded-full text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_#0f172a] animate-pulse">
                            <Sparkles className="w-3 h-3 text-[#FBBC05]" />
                            Featured Event
                          </span>
                        )}
                      </div>

                      <div className="bg-[#EA4335] border-2 border-slate-900 rounded-xl w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center shadow-[4px_4px_0_#0f172a] rotate-3 group-hover:rotate-0 transition-transform">
                        <span className="text-[9px] md:text-[11px] font-black text-white uppercase leading-none mt-1">
                          {event.start_datetime
                            ? new Date(event.start_datetime).toLocaleDateString(
                                'en-US',
                                { month: 'short' }
                              )
                            : 'TBA'}
                        </span>
                        <span className="text-xl md:text-2xl font-black text-white leading-none">
                          {event.start_datetime
                            ? new Date(event.start_datetime).toLocaleDateString(
                                'en-US',
                                { day: '2-digit' }
                              )
                            : '??'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Content */}
                    <div
                      className={`absolute inset-x-0 bottom-0 p-6 z-20 ${isFeatured ? 'md:p-10 md:max-w-4xl' : ''}`}
                    >
                      <h3
                        className={`font-black text-white uppercase tracking-tight leading-[0.9] ${antonio.className} line-clamp-3 
                          ${isFeatured ? 'text-4xl sm:text-5xl lg:text-7xl' : 'text-2xl sm:text-3xl'}`}
                      >
                        {event.title}
                      </h3>
                      {isFeatured && event.description && (
                        <p className="hidden md:block text-white/70 text-sm font-bold mt-4 line-clamp-2 max-w-xl">
                          {event.description}
                        </p>
                      )}
                      <div className="w-12 h-1 mt-6" style={{ backgroundColor: color }} />

                      {/* Hover details / Info row */}
                      <div
                        className={`transition-opacity duration-500 mt-4 flex items-center gap-6 text-xs md:text-sm text-gray-300 font-bold 
                          ${isFeatured ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#4285F4]" />
                          {event.start_datetime
                            ? formatTime(event.start_datetime)
                            : 'TBA'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#EA4335]" />
                          {event.venue || 'Online'}
                        </span>
                        {isFeatured && event.seats_available > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-[#34A853]" />
                            {event.seats_available} Seats Available
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              /* Inline Empty State Card */
              <div className="event-card relative aspect-[16/10] bg-white border-[3px] border-slate-900 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center shadow-[8px_8px_0_#0f172a]">
                <div className="w-16 h-16 bg-[#FBBC05] border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-5 shadow-[4px_4px_0_#0f172a] rotate-3">
                  <Calendar className="w-8 h-8 text-slate-900" />
                </div>
                <h3
                  className={`text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3 ${antonio.className}`}
                >
                  Still Cooking...
                </h3>
                <p className="text-slate-600 font-bold text-xs leading-relaxed max-w-xs px-2">
                  Looks like we&apos;re still cooking something amazing. Come back later for new events!
                </p>
                <div className="mt-5 flex gap-1.5">
                  {GOOGLE_COLORS.map((c, i) => (
                    <div
                      key={c}
                      className="w-2.5 h-2.5 rounded-full animate-bounce"
                      style={{
                        backgroundColor: c,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Explore More Card - Only render when events exist */}
            {combinedEvents.length > 0 && (
              <Link
                href="/events"
                className="event-card cta-card group relative aspect-[16/10] bg-[#4285F4] border-[3px] border-slate-900 rounded-[2rem] overflow-hidden shadow-[8px_8px_0_#0f172a] hover:shadow-[4px_4px_0_#0f172a] hover:-translate-y-2 hover:translate-x-1 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white/20,transparent)]" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-white border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0_#0f172a] group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <ArrowRight className="w-8 h-8 text-[#4285F4]" />
                  </div>
                  <h3
                    className={`text-4xl font-black text-white uppercase tracking-tighter leading-none mb-4 ${antonio.className}`}
                  >
                    EXPLORE ALL EVENTS
                  </h3>
                  <p className="text-white/80 font-bold text-xs uppercase tracking-widest">
                    View our full calendar
                  </p>
                </div>
              </Link>
            )}

            {/* Host an Event Card */}
            <Link
              href="/about"
              className="event-card cta-card group relative aspect-[16/10] bg-[#FBBC05] border-[3px] border-slate-900 rounded-[2rem] overflow-hidden shadow-[8px_8px_0_#0f172a] hover:shadow-[4px_4px_0_#0f172a] hover:-translate-y-2 hover:translate-x-1 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white/20,transparent)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-white border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0_#0f172a] group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                  <Sparkles className="w-8 h-8 text-[#FBBC05]" />
                </div>
                <h3
                  className={`text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4 ${antonio.className}`}
                >
                  HOST YOUR OWN EVENT
                </h3>
                <p className="text-slate-900/60 font-bold text-xs uppercase tracking-widest">
                  Collaborate with us
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── EXPANDED EVENT VIEW ── */}
      {expandedEvent && (
        <div
          ref={expandedRef}
          className="expanded-content fixed inset-0 z-[100] flex flex-col overflow-y-auto"
        >
          {/* Background Image */}
          <div className="expanded-bg absolute inset-0">
            {expandedEvent.banner_url ? (
              <img
                src={expandedEvent.banner_url}
                alt={expandedEvent.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, #4285F4 0%, #0f172a 100%)`,
                }}
              />
            )}
          </div>

          {/* Dark Overlay */}
          <div 
            onClick={collapseEvent}
            className="expanded-overlay absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50 cursor-pointer z-10" 
          />

          {/* Back Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              collapseEvent();
            }}
            className="back-button fixed top-8 left-8 z-[120] flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-full text-white text-sm font-black uppercase tracking-widest hover:bg-white/20 transition-all group shadow-2xl"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Events
          </button>

          {/* Content */}
          <div className="relative z-20 flex-1 flex flex-col lg:flex-row items-center px-8 sm:px-12 lg:px-20 py-28 gap-12 lg:gap-20">
            {/* Left: Title & Tags */}
            <div className="flex-1 flex flex-col justify-center max-w-2xl">
              {/* Tags */}
              <div className="flex flex-wrap gap-3 mb-8">
                <span
                  className="expanded-tag px-4 py-1.5 rounded-full border-2 border-white/30 text-white text-xs font-black uppercase tracking-widest"
                  style={{
                    backgroundColor:
                      GOOGLE_COLORS[
                        combinedEvents.findIndex(
                          (e) => e.event_id === expandedEvent.event_id
                        ) % GOOGLE_COLORS.length
                      ] || '#4285F4',
                  }}
                >
                  {expandedEvent.category_name || 'General'}
                </span>
                <span className="expanded-tag px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white text-xs font-black uppercase tracking-widest">
                  {expandedEvent.event_type || 'Event'}
                </span>
                {expandedEvent.is_free && (
                  <span className="expanded-tag px-4 py-1.5 rounded-full bg-[#34A853] border-2 border-white/20 text-white text-xs font-black uppercase tracking-widest">
                    Free Entry
                  </span>
                )}
              </div>

              {/* Title */}
              <h2
                ref={titleWordsRef}
                className={`text-5xl sm:text-6xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-[0.85] ${antonio.className}`}
                style={{ perspective: '600px' }}
              >
                {expandedEvent.title}
              </h2>

              {/* Event Meta Row */}
              <div className="flex flex-wrap gap-6 mt-10 text-white/80 text-sm font-bold">
                {expandedEvent.start_datetime && (
                  <span className="expanded-tag flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#4285F4]" />
                    {formatDate(expandedEvent.start_datetime)}
                  </span>
                )}
                {expandedEvent.start_datetime && (
                  <span className="expanded-tag flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FBBC05]" />
                    {formatTime(expandedEvent.start_datetime)}
                  </span>
                )}
                <span className="expanded-tag flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#EA4335]" />
                  {expandedEvent.venue || 'Online'}
                </span>
                <span className="expanded-tag flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#34A853]" />
                  {expandedEvent.seats_available > 0
                    ? `${expandedEvent.seats_available} Seats`
                    : 'Sold Out'}
                </span>
                {!expandedEvent.is_free && expandedEvent.ticket_price && (
                  <span className="expanded-tag flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-[#FBBC05]" />
                    Rs. {expandedEvent.ticket_price}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Description & CTA */}
            <div className="expanded-right flex-1 max-w-lg flex flex-col justify-center">
              <div className="bg-white/5 backdrop-blur-md border-2 border-white/10 rounded-3xl p-8 sm:p-10">
                <h3 className="text-white text-lg font-black uppercase tracking-widest mb-4">
                  About This Event
                </h3>
                <p className="text-white/80 text-base leading-relaxed font-medium">
                  {expandedEvent.description ||
                    'Details coming soon. Stay tuned for more information about this exciting event!'}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/events/${expandedEvent.event_id}`}
                    className="detail-link inline-flex h-14 items-center justify-center px-8 bg-white text-slate-900 rounded-full text-sm font-black uppercase tracking-widest hover:-translate-y-1 transition-transform border-[3px] border-slate-900 shadow-[4px_4px_0_#4285F4] gap-3 group"
                  >
                    View Full Details
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
