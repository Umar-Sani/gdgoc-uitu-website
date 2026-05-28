'use client';

import { useRef } from 'react';
import Image from 'next/image';
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
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const container = containerRef.current;
      if (!section || !container) return;

      // ── Main Horizontal Scroll Animation ──
      const scrollTween = gsap.to(container, {
        x: () => -(container.scrollWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => `+=${container.scrollWidth}`,
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

      // ── Snappy Scrolling Words Box 1 ──
      const tl1 = gsap.timeline({ repeat: -1 });
      tl1.to('.scrolling-words-1', { yPercent: -25, ease: 'power4.inOut', duration: 0.8, delay: 1.5 })
         .to('.scrolling-words-1', { yPercent: -50, ease: 'power4.inOut', duration: 0.8, delay: 1.5 })
         .to('.scrolling-words-1', { yPercent: -75, ease: 'power4.inOut', duration: 0.8, delay: 1.5 });

      // ── Snappy Scrolling Words Box 2 ──
      const tl2 = gsap.timeline({ repeat: -1 });
      tl2.to('.scrolling-words-2', { yPercent: -25, ease: 'power4.inOut', duration: 0.8, delay: 1.5 })
         .to('.scrolling-words-2', { yPercent: -50, ease: 'power4.inOut', duration: 0.8, delay: 1.5 })
         .to('.scrolling-words-2', { yPercent: -75, ease: 'power4.inOut', duration: 0.8, delay: 1.5 });

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

      // ── CTA Panel Reveal ──
      gsap.from('.cta-element', {
        scale: 0.8,
        opacity: 0,
        y: 50,
        stagger: 0.1,
        ease: 'back.out(1.5)',
        scrollTrigger: {
          trigger: '.cta-panel',
          containerAnimation: scrollTween,
          start: 'left 85%',
          end: 'left 50%',
          scrub: 1,
        },
      });

    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white overflow-hidden flex items-center relative font-sans"
    >
      {/* Background grain or subtle gradient could go here */}

      <div
        ref={containerRef}
        className="flex flex-nowrap items-center w-max px-[10vw] gap-6 relative z-10"
      >
        <span className="massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight">
          WE ARE
        </span>

        {/* Floater: Logo */}
        <div className="floater flex-shrink-0 mx-2 w-24 h-24 md:w-32 md:h-32 relative" data-speed="1.5">
          <Image
            src="/images/logolight.png"
            alt="GDGOC Logo"
            fill
            className="object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          />
        </div>

        <span className="massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight relative">
          BUILDERS, CREATORS, AND INNOVATORS.
          {/* Floater: Pill */}
          <div className="floater absolute -top-12 right-0 bg-gradient-to-r from-[#ff7c70] to-[#EA4335] text-white px-6 py-2 rounded-xl text-xl font-bold -rotate-6 shadow-xl" data-speed="2">
            That's right
          </div>
        </span>

        <span className="massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight ml-12 relative">
          WE DO
        </span>

        {/* Scrolling Box 1 */}
        <div className="scrolling-box-1 flex-shrink-0 h-[clamp(3.5rem,7vw,8rem)] overflow-hidden bg-gradient-to-r from-[#34A853] to-[#288a44] text-white px-8 rounded-[2rem] mx-2 flex flex-col justify-start shadow-2xl relative">
          <div className="scrolling-words-1 flex flex-col">
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <Star size={48} fill="currentColor" />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">WORKSHOPS</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <Zap size={48} fill="currentColor" />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">HACKATHONS</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <Rocket size={48} fill="currentColor" />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">PROJECTS</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <Star size={48} fill="currentColor" />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">WORKSHOPS</span>
            </div>
          </div>
        </div>

        <span className="massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight ml-12">
          AND A GLOBAL NETWORK OF PASSIONATE STUDENTS
        </span>

        {/* Scrolling Box 2 */}
        <div className="scrolling-box-2 flex-shrink-0 h-[clamp(3.5rem,7vw,8rem)] overflow-hidden bg-gradient-to-r from-[#4285F4] to-[#3474d4] text-white px-8 rounded-[2rem] mx-2 flex flex-col justify-start shadow-2xl relative">
          <div className="scrolling-words-2 flex flex-col">
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <BookOpen size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">LEARNING TOGETHER</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <HeartHandshake size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">HELPING EACH OTHER</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <TrendingUp size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">GROWING TOGETHER</span>
            </div>
            <div className="h-[clamp(3.5rem,7vw,8rem)] flex items-center gap-4">
              <BookOpen size={48} />
              <span className="text-[clamp(2.5rem,5vw,6rem)] font-bold tracking-tight">LEARNING TOGETHER</span>
            </div>
          </div>
        </div>

        <span className="massive-text flex-shrink-0 whitespace-nowrap text-[clamp(2.5rem,5vw,6rem)] font-medium tracking-tight ml-12">
          AT UITU.
        </span>

        {/* CTA Panel */}
        <div className="cta-panel flex-shrink-0 flex items-center gap-8 ml-24 mr-32">
          <Link
            href="/about"
            className="cta-element px-10 py-5 bg-white text-black rounded-full text-2xl md:text-4xl font-bold hover:bg-gray-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Read more about us
          </Link>
          
          <div className="flex gap-4">
            <a href="#" className="cta-element bg-[#27272a] p-5 rounded-full text-white hover:bg-[#ff7c70] transition-colors">
              <Instagram size={32} />
            </a>
            <a href="#" className="cta-element bg-[#27272a] p-5 rounded-full text-white hover:bg-[#4285F4] transition-colors">
              <Linkedin size={32} />
            </a>
            <a href="#" className="cta-element bg-[#27272a] p-5 rounded-full text-white hover:bg-[#34A853] transition-colors">
              <LinkIcon size={32} />
            </a>
          </div>
        </div>
        
        <div className="w-[10vw] flex-shrink-0" />
      </div>
    </section>
  );
}
