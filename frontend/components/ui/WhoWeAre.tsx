'use client';

import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { Instagram, Linkedin, Link as LinkIcon, Star, Zap, Rocket, BookOpen, HeartHandshake, TrendingUp } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export default function WhoWeAre() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const container = containerRef.current;
      if (!section || !container) return;

      // ── Main Horizontal Scroll Animation ──
      // End the scroll when the UITU flip element is centered in the viewport
      // (instead of scrolling all the way to the container's right edge).
      const getEndX = () => {
        const flip = flipRef.current;
        if (!flip) return -(container.scrollWidth - window.innerWidth);
        // Static offset of the flip's centre from the container's left edge
        // (rect difference is invariant to the current transform).
        const cRect = container.getBoundingClientRect();
        const fRect = flip.getBoundingClientRect();
        const flipCenterOffset = fRect.left - cRect.left + fRect.width / 2;
        return window.innerWidth / 2 - flipCenterOffset;
      };

      // No GSAP pin — the section is pinned via CSS `position: sticky` and the
      // outer wrapper reserves the scroll height in CSS (known at SSR). This avoids
      // a pin-spacer being injected after hydration, which was causing large CLS.
      const scrollTween = gsap.to(container, {
        x: getEndX,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapperRef.current,
          scrub: 1,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
        },
      });

      // ── Floating Elements Parallax / Reveal ──
      const floaters = gsap.utils.toArray('.floater');
      floaters.forEach((floater: any) => {
        const speed = floater.dataset.speed || 1;
        gsap.from(floater, {
          y: 100 * speed,
          rotation: 45 * speed,
          opacity: 0,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: floater,
            containerAnimation: scrollTween,
            start: 'left 90%',
            end: 'left 30%',
            scrub: 1,
          },
        });
      });

      // ── "That's Right" flourish — words reveal one after another (with a colour glow) ──
      gsap.timeline({
        scrollTrigger: {
          trigger: '.thats-trigger',
          containerAnimation: scrollTween,
          start: 'left 90%',
          toggleActions: 'play none none reverse',
        },
      })
        .from('.thats-word-1', { scale: 0.6, opacity: 0, y: 20, ease: 'back.out(1.5)', duration: 0.5 })
        .from('.thats-word-2', { scale: 0.6, opacity: 0, y: 20, ease: 'back.out(1.5)', duration: 0.5 }, '-=0.1');

      // ── "WE DO" boxes flip down into view ──
      (gsap.utils.toArray('.flip-in-box') as HTMLElement[]).forEach((box) => {
        gsap.from(box, {
          rotateX: -90,
          opacity: 0,
          transformOrigin: 'top center',
          ease: 'power3.out',
          duration: 0.8,
          scrollTrigger: {
            trigger: box,
            containerAnimation: scrollTween,
            start: 'left 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // ── UITU text ↔ logo flip (back and forth) ──
      gsap.to('.flip-uitu-inner', {
        rotationY: 180,
        duration: 1,
        ease: 'power3.inOut',
        repeat: -1,
        yoyo: true,
        repeatDelay: 1.5,
        transformOrigin: 'center center',
      });

      // ── Community values flip-board (cycles through the three values on one line) ──
      gsap.set('.community-face-0', { rotateX: 0 });
      gsap.set('.community-face-1', { rotateX: 90 });
      gsap.set('.community-face-2', { rotateX: 90 });

      const cFlip = 0.3; // flip duration (out, then in — sequential)
      const cHold = 1.6; // time each value stays on screen
      // Each transition: current face flips fully out, THEN the next flips in
      // (sequential, no overlap → clean flip-board reveal).
      gsap.timeline({ repeat: -1, defaults: { duration: cFlip, ease: 'power2.inOut' } })
        .to({}, { duration: cHold })
        .to('.community-face-0', { rotateX: -90 })
        .to('.community-face-1', { rotateX: 0 })
        .to({}, { duration: cHold })
        .to('.community-face-1', { rotateX: -90 })
        .to('.community-face-2', { rotateX: 0 })
        .to({}, { duration: cHold })
        .to('.community-face-2', { rotateX: -90 })
        .set('.community-face-0', { rotateX: 90 })
        .to('.community-face-0', { rotateX: 0 });

      // ── Text Splitting & Revealing ──
      const massiveTexts = gsap.utils.toArray('.massive-text') as HTMLElement[];

      massiveTexts.forEach((textElement) => {
        const split = new SplitText(textElement, { type: 'words, chars', tag: 'span' });

        split.chars.forEach((char) => {
          gsap.from(char, {
            yPercent: gsap.utils.random(-150, 150),
            xPercent: gsap.utils.random(-100, 100),
            rotation: gsap.utils.random(-45, 45),
            opacity: 0,
            ease: 'back.out(1.2)',
            scrollTrigger: {
              trigger: char,
              containerAnimation: scrollTween,
              start: 'left 95%',
              end: 'left 30%',
              scrub: 1,
            },
          });
        });
      });

      // ── Fade out everything except "AT UITU" + CTA as the scroll reaches the end ──
      // Single scrubbed opacity tween (GPU-composited → no performance cost).
      gsap.to('.we-are-prelude', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: 'bottom bottom+=60%', // begin fading only in the final stretch (later)
          end: 'bottom bottom',        // fully gone exactly when AT UITU is centered
          scrub: true,
        },
      });

      // ── Recompute the scroll-end position after late-loading assets (logo, fonts) ──
      // getEndX() depends on the flip box size; refresh once everything has settled
      // so the UITU element still lands centered regardless of load timing.
      const refresh = () => ScrollTrigger.refresh();
      if (document.fonts?.ready) document.fonts.ready.then(refresh);
      if (document.readyState === 'complete') {
        refresh();
      } else {
        window.addEventListener('load', refresh);
      }

      return () => window.removeEventListener('load', refresh);
    },
    { scope: sectionRef }
  );

  return (
    // Outer wrapper reserves the scroll height in CSS (SSR-known) so no layout
    // shift occurs after hydration. Tune `height` to change the scroll pacing.
    <div ref={wrapperRef} className="relative w-full" style={{ height: '600vh' }}>
      <section
        ref={sectionRef}
        className="sticky top-0 h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white overflow-hidden flex items-center font-sans"
      >
        <div
          ref={containerRef}
          className="flex flex-nowrap items-center w-max gap-6 relative z-10 will-change-transform"
        >
          {/* ── Intro Frame — "WE ARE" + Google Developers logo, large & centered at the start ── */}
          <div className="we-are-prelude flex-shrink-0 w-screen flex items-center justify-center gap-12 md:gap-24">
            <span className="whitespace-nowrap text-[clamp(3rem,8vw,9rem)] font-black tracking-tight">
              WE ARE
            </span>
            {/* Google Developers logo → swaps to GDGoC-UITU on hover */}
            <span className="group relative inline-block w-64 md:w-80 lg:w-[26rem] aspect-[256/125] cursor-pointer">
              <img
                src="/images/logolight2.png"
                alt="Google Developers Group on Campus - UIT University"
                className="absolute relative top-2 inset-0 w-full h-full object-contain drop-shadow-[0_0_25px_rgba(66,133,244,0.3)] transition-opacity duration-300 group-hover:opacity-0"
                draggable={false}
              />
              <img
                src="/images/google-developers-seeklogo.svg"
                alt="GDGoC-UITU"
                className="absolute inset-0 w-full h-full object-contain opacity-0 drop-shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-opacity duration-300 group-hover:opacity-100"
                draggable={false}
              />
            </span>
          </div>

          {/* UITU building silhouette — faint background. Absolute so it scrolls with the
              track but takes no flow space, and sits behind the text (negative z). */}
          <div className="we-are-prelude pointer-events-none absolute top-1/2 left-[85vw] -translate-x-1/2 -translate-y-1/2 -z-10">
            <img
              src="/images/UITU%20Building%20Silhouette.png"
              alt=""
              className="h-[640px] w-auto max-w-none object-contain opacity-[0.12]"
              draggable={false}
            />
          </div>

          <span className="we-are-prelude massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight">
            BUILDERS, CREATORS, AND INNOVATORS
          </span>

          {/* "That's Right" — two-line flourish sized to the sentence height, fits between INNOVATORS and WE DO */}
          <div className="thats-trigger we-are-prelude flex-shrink-0 self-center ml-4 flex flex-col items-center justify-center leading-[0.85] text-center">
            <span className="thats-word-1 uppercase font-black tracking-tighter text-white text-[clamp(1.2rem,2.4vw,2.7rem)]">That&apos;s</span>
            <span className="thats-word-2 uppercase font-black tracking-tighter text-white text-[clamp(1.2rem,2.4vw,2.7rem)]">Right</span>
          </div>

          <span className="we-are-prelude massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight ml-4 relative">
            WE DO
          </span>

          {/* WE DO — Workshops + Projects inline on the sentence line, Hackathons centered below */}
          <div className="we-are-prelude flex-shrink-0 relative flex items-center gap-5" style={{ perspective: '1200px' }}>
            <div className="flip-in-box will-change-transform flex-shrink-0 h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#34A853] to-[#288a44] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              {/* <Star size={48} fill="currentColor" /> */}
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">WORKSHOPS</span>
            </div>
            <div className="flip-in-box will-change-transform flex-shrink-0 h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#4285F4] to-[#3474d4] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              {/* <Rocket size={48} fill="currentColor" /> */}
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">PROJECTS</span>
            </div>
            {/* Hackathons — centered below the two boxes (absolute so it doesn't shift the row off the line) */}
            <div className="flip-in-box will-change-transform absolute left-1/2 top-full -translate-x-1/2 mt-5 flex-shrink-0 h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#EA4335] to-[#c53026] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              {/* <Zap size={48} fill="currentColor" /> */}
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">HACKATHONS</span>
            </div>
          </div>

          <span className="we-are-prelude massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight ml-12">
            AND HAVE A GLOBAL NETWORK OF PASSIONATE STUDENTS
          </span>

          {/* Community values — single flip-board cycling through the three values on one line */}
          <div className="we-are-prelude flex-shrink-0 inline-grid" style={{ perspective: '1200px' }}>
            <div className="community-face-0 [grid-area:1/1] place-self-center [backface-visibility:hidden] will-change-transform h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#4285F4] to-[#3474d4] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              <BookOpen size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">LEARNING TOGETHER</span>
            </div>
            <div className="community-face-1 [grid-area:1/1] place-self-center [backface-visibility:hidden] will-change-transform h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#34A853] to-[#288a44] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              <TrendingUp size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">GROWING TOGETHER</span>
            </div>
            <div className="community-face-2 [grid-area:1/1] place-self-center [backface-visibility:hidden] will-change-transform h-[clamp(3.5rem,7vw,8rem)] bg-gradient-to-r from-[#ff7c70] to-[#EA4335] text-white px-8 rounded-[2rem] flex items-center gap-4 shadow-2xl">
              <HeartHandshake size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight whitespace-nowrap">HELPING EACH OTHER</span>
            </div>
          </div>

          {/* ── Final Segment — "AT UITU" inline on the sentence line; CTA sits below the logo ── */}
          <div className="relative flex-shrink-0 inline-flex items-center gap-8 whitespace-nowrap text-[clamp(3rem,8vw,9rem)] font-medium tracking-tight ml-12">
            <span className="massive-text">AT</span>

            {/* UITU text ↔ logo flip */}
            <span ref={flipRef} className="flip-uitu inline-block relative align-middle" style={{ perspective: '1000px' }}>
              <span className="flip-uitu-inner inline-grid will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
                {/* Front face — UITU text (inline with the sentence) */}
                <span
                  className="[grid-area:1/1] inline-flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  UITU
                </span>
                {/* Back face — UITU logo (large) */}
                <span
                  className="[grid-area:1/1] inline-flex items-center justify-center"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <img
                    src="/images/UITU%20LOGO%20WHITE.png"
                    alt="UITU"
                    className="h-[clamp(7rem,14vw,16rem)] aspect-square object-contain"
                    draggable={false}
                  />
                </span>
              </span>
            </span>

            {/* CTA — brutalist buttons below the logo (matches forum style); absolute so it doesn't push "AT UITU" off the line */}
            <div className="cta-panel absolute left-1/2 -translate-x-1/2 top-full mt-16 flex flex-row items-center gap-4">
              <Link
                href="/about"
                className="cta-element px-6 py-3 bg-white text-black text-xs sm:text-sm font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0_#4285F4] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap"
              >
                Read more about us
              </Link>

              <a href="#" className="cta-element w-11 h-11 flex items-center justify-center bg-white/5 border-2 border-white/20 text-white shadow-[4px_4px_0_rgba(255,255,255,0.12)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-[#ff7c70] hover:border-[#ff7c70] transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="cta-element w-11 h-11 flex items-center justify-center bg-white/5 border-2 border-white/20 text-white shadow-[4px_4px_0_rgba(255,255,255,0.12)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-[#4285F4] hover:border-[#4285F4] transition-all">
                <Linkedin size={18} />
              </a>
              <a href="#" className="cta-element w-11 h-11 flex items-center justify-center bg-white/5 border-2 border-white/20 text-white shadow-[4px_4px_0_rgba(255,255,255,0.12)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none hover:bg-[#34A853] hover:border-[#34A853] transition-all">
                <LinkIcon size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
