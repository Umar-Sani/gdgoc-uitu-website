'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence, useMotionValue, useSpring, useMotionTemplate, animate } from 'framer-motion';
import Magnetic from '../../components/ui/magnetic';
import { BrutalistMemberCard } from '../../components/ui/BrutalistMemberCard';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'] });
// ─── Types ────────────────────────────────────────────────────────────────────

type Homepage = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_url: string;
  stats_members: number;
  stats_events: number;
  stats_projects: number;
  announcement: string | null;
};

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

type FeaturedEvent = {
  id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string | null;
  category: string | null;
  display_order: number;
  linked_event_title: string | null;
  linked_event_status: string | null;
};

type Thread = {
  thread_id: string;
  title: string;
  body_preview: string;
  category_name: string;
  category_color: string;
  reply_count: number;
  upvote_count: number;
  created_at: string;
  author_name: string;
};

type SocialPost = {
  post_id: string;
  platform: string;
  caption: string;
  media_urls: string[];
  hashtags: string[];
  posted_at: string | null;
  status: string;
};

type TeamMember = {
  member_id: string;
  full_name: string;
  role_title: string;
  bio: string | null;
  avatar_url: string | null;
  display_order: number;
};

type Sponsor = {
  sponsor_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  tier: string;
};

// ─── Hardcoded Testimonials ───────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Fatima Zahra',
    role: 'Flutter Developer',
    quote: 'The Flutter workshop at GDGOC-UITU completely changed how I approach mobile development. The hands-on sessions were incredibly valuable.',
    avatar: null,
  },
  {
    id: 2,
    name: 'Ahmed Raza',
    role: 'CS Student, UIT',
    quote: 'I attended the AI/ML bootcamp and left with real skills I could apply immediately. The community here is genuinely supportive.',
    avatar: null,
  },
  {
    id: 3,
    name: 'Zainab Hassan',
    role: 'Web Developer',
    quote: 'GDGOC events are always well organized and the content is always relevant to what the industry actually needs right now.',
    avatar: null,
  },
];

// ─── Tech Stack ───────────────────────────────────────────────────────────────

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

// ─── Platform Colors ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { color: string; label: string }> = {
  instagram: { color: '#E1306C', label: 'Instagram' },
  twitter: { color: '#1DA1F2', label: 'Twitter' },
  linkedin: { color: '#0A66C2', label: 'LinkedIn' },
  facebook: { color: '#1877F2', label: 'Facebook' },
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Stat Counter ─────────────────────────────────────────────────────────────

function StatCounter({ value, label }: { value: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const steps = 40;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-bold text-white">{count.toLocaleString()}+</p>
      <p className="text-sm text-blue-200 mt-1">{label}</p>
    </div>
  );
}

// ─── Component: Buttery Smooth Interpolated Pooled Trail ────────────────────

const LIQUID_SPLATS = [
  "M -10 0 C -10 -5.5 -5.5 -10 0 -10 C 5.5 -10 10 -5.5 10 0 C 10 5.5 5.5 10 0 10 C -5.5 10 -10 5.5 -10 0 Z", // Circle
  "M -12 -2 C -12 -8 0 -15 8 -8 C 16 -1 15 10 5 12 C -5 14 -12 4 -12 -2 Z", // Organic blob 1
  "M -8 -10 C 2 -15 15 -5 10 5 C 5 15 -10 15 -12 2 C -14 -11 -18 -5 -8 -10 Z", // Organic blob 2
  "M -10 -10 C -5 -15 5 -15 10 -10 C 15 -5 15 5 10 10 C 5 15 -5 15 -10 10 C -15 5 -15 -5 -10 -10 Z" // Organic blob 3
];

function InkMaskOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Object pooling for buttery smooth, zero-latency 144Hz continuous interpolation tracking
  const SPLAT_COUNT = 80;
  const xs = useRef(Array.from({ length: SPLAT_COUNT }, () => useMotionValue(-1000))).current;
  const ys = useRef(Array.from({ length: SPLAT_COUNT }, () => useMotionValue(-1000))).current;
  const scales = useRef(Array.from({ length: SPLAT_COUNT }, () => useMotionValue(0))).current;
  const rots = useRef(Array.from({ length: SPLAT_COUNT }, () => Math.random() * 360)).current;
  const paths = useRef(Array.from({ length: SPLAT_COUNT }, () => Math.floor(Math.random() * LIQUID_SPLATS.length))).current;

  useEffect(() => {
    let lastX = -1;
    let lastY = -1;
    let poolIdx = 0;

    const triggerSplash = (x: number, y: number, isAuto = false) => {
      poolIdx = (poolIdx + 1) % SPLAT_COUNT;
      xs[poolIdx].set(x);
      ys[poolIdx].set(y);

      const targetScale = isAuto ? 45.0 : (Math.random() * 3.0 + 8.0);
      const sweepDur = isAuto ? 5.0 : (Math.random() * 1.0 + 4.0);

      animate(scales[poolIdx], [0, targetScale, targetScale * 0.9, 0], {
        duration: sweepDur,
        times: [0, 0.1, 0.2, 1],
        ease: ["easeOut", "easeInOut", "easeIn"]
      });
    };

    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const currX = e.clientX;
      const currY = e.clientY;

      const insideHero = e.clientY >= rect.top && e.clientY <= rect.bottom && e.clientX >= rect.left && e.clientX <= rect.right;
      if (!insideHero) {
        lastX = -1; // Reset when leaving wrapper
        return;
      }

      if (lastX === -1) {
        lastX = currX;
        lastY = currY;
      }

      const dx = currX - lastX;
      const dy = currY - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Interpolate one drop every 10 pixels to guarantee an unbroken solid fluid line even during rapid mouse flinging
      const steps = Math.max(1, Math.floor(dist / 10));

      for (let i = 1; i <= steps; i++) {
        const nx = lastX + dx * (i / steps);
        const ny = lastY + dy * (i / steps);
        triggerSplash(nx, ny);
      }

      lastX = currX;
      lastY = currY;
    };

    // Auto-splash every 5 seconds with a horizontal "scanning" sweep
    const autoInterval = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      const sweepSteps = 25; // Higher density for a solid continuous line
      const sweepDuration = 1200; // Duration of one horizontal sweep in ms

      // Phase 1: Top-Third Sweep (Left to Right)
      const topY = rect.top + rect.height * 0.25;
      for (let i = 0; i <= sweepSteps; i++) {
        setTimeout(() => {
          const xPos = rect.left + (rect.width * i / sweepSteps);
          triggerSplash(xPos, topY, true);
        }, i * (sweepDuration / sweepSteps));
      }

      // Phase 2: Bottom-Third Sweep (Right to Left) - Starts after Phase 1 finishes
      const bottomY = rect.top + rect.height * 0.75;
      for (let i = 0; i <= sweepSteps; i++) {
        setTimeout(() => {
          const xPos = rect.right - (rect.width * i / sweepSteps);
          triggerSplash(xPos, bottomY, true);
        }, sweepDuration + (i * (sweepDuration / sweepSteps)) + 200);
      }
    }, 10000);

    // window.addEventListener('mousemove', handleMove);
    return () => {
      // window.removeEventListener('mousemove', handleMove);
      clearInterval(autoInterval);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[5] pointer-events-none overflow-hidden" style={{ WebkitMaskImage: 'url(#ink-mask)', maskImage: 'url(#ink-mask)' }}>

      {/* ── Hidden Mask Stickers ── */}
      <img src="/images/Android Guy Standing Still.png" alt="Android Standing Shadow" className="absolute left-4 sm:left-12 lg:left-32 top-1/2 -translate-y-1/2 h-48 md:h-80 w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] opacity-95 -rotate-6" />
      <img src="/images/Android WOMAN Standing Still.png" alt="Android Society Shadow" className="absolute right-4 sm:right-12 lg:right-32 top-1/2 -translate-y-1/2 h-48 md:h-80 w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] opacity-95 rotate-6" />

      {/* ── Main Center Logo ── */}
      <img src="/images/google-developers-seeklogo.svg" alt="Mask Reveal Image" className="w-full h-full object-contain p-10 md:p-32 opacity-100 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative z-10" />

      {/* Invisible dynamic mask definition */}
      {/* Invisible dynamic mask definitions (Full screen SVG but transparent/non-interactive) */}
      <svg className="fixed top-0 left-0 w-full h-full pointer-events-none z-[1001] opacity-0">
        <defs>
          <mask id="ink-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100vw" height="100vh">
            <rect width="100%" height="100%" fill="black" />
            <g filter="url(#gooey)">
              {xs.map((_, i) => (
                <motion.path
                  key={i}
                  d={LIQUID_SPLATS[paths[i]]}
                  fill="white" // White reveals the mask contents
                  style={{
                    x: xs[i],
                    y: ys[i],
                    scale: scales[i],
                    rotate: rots[i],
                    originX: 0,
                    originY: 0
                  }}
                />
              ))}
            </g>
          </mask>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -25" result="gooey" />
          </filter>

          <mask id="hide-text-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100vw" height="100vh">
            {/* White background: everything visible by default */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black splashes: hide everything under them */}
            <g filter="url(#gooey)">
              {xs.map((_, i) => (
                <motion.path
                  key={i}
                  d={LIQUID_SPLATS[paths[i]]}
                  fill="black"
                  style={{
                    x: xs[i],
                    y: ys[i],
                    scale: scales[i],
                    rotate: rots[i],
                    originX: 0,
                    originY: 0
                  }}
                />
              ))}
            </g>
          </mask>
        </defs>
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FEATURE_SLIDES = [
  {
    id: 'workshops',
    title: 'WORKSHOPS',
    description: 'Hands-on technical sessions on Flutter, AI/ML, Web Dev and more designed to take you from zero to builder.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop',
    color: '#FBBC05'
  },
  {
    id: 'hackathons',
    title: 'HACKATHONS',
    description: 'Intense 24-hour build competitions where you can turn ideas into reality and win real ecosystem prizes.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=2070&auto=format&fit=crop',
    color: '#EA4335'
  },
  {
    id: 'community',
    title: 'COMMUNITY',
    description: 'A global network of passionate students learning together, helping each other, and growing together.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
    color: '#4285F4'
  }
];

const SOCIAL_LINKS = [
  { platform: 'Instagram', url: 'https://instagram.com/gdgocuitu', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
  { platform: 'LinkedIn', url: 'https://linkedin.com/company/gdgocuitu', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
  { platform: 'Linktree', url: 'https://linktr.ee/gdgocuitu', icon: 'M14.54 11.53c.63-.44 1.05-1.15 1.05-1.95 0-1.32-1.07-2.39-2.39-2.39h-4.3v4.34H11.5c.8 0 1.51-.42 1.95-1.05.44.63 1.15 1.05 1.95 1.05h2.59v-2.59h-2.59c-.8 0-1.51.42-1.95 1.05-.44-.63-1.15-1.05-1.95-1.05h-2.59v4.34h4.3c1.32 0 2.39-1.07 2.39-2.39 0-.8-.42-1.51-1.05-1.95zm-3.04-1.42h-1.3v-1.3h1.3c.36 0 .65.29.65.65s-.29.65-.65.65zm1.3 1.42c.36 0 .65.29.65.65s-.29.65-.65.65h-1.3v-1.3h1.3zM24 12c0-6.627-5.373-12-12-12S0 5.373 0 12s5.373 12 12 12 12-5.373 12-12zm-2 0c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z' }
];

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const words = ["BUILD", "SHIP", "GROW", "LEAD", "HACK", "CODE", "WIN", "SHINE"];
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ─── CMS Data ──────────────────────────────────────────────────────────────
  const [homepage, setHomepage] = useState<Homepage | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [featuredPastEvents, setFeaturedPastEvents] = useState<FeaturedEvent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Identity section ref for scroll-masking
  const identitySectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: identitySectionRef,
    offset: ["start end", "center center"]
  });

  const waveRevealY = useTransform(scrollYProgress, [0, 1], ["20%", "0%"]);
  const waveOpacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);

  // Scroll hooks for parallax wavy transition
  const { scrollY } = useScroll();
  const waveY = useTransform(scrollY, [0, 800], [0, -100]);
  const waveYReverse = useTransform(scrollY, [0, 800], [0, 100]);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Testimonial carousel
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // ─── Unified Events Hover State ─────────────────────────────────────────────
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/cms/homepage`).then((r) => r.json()),
      fetch(`${API_URL}/api/events?status=upcoming&limit=4`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/featured-events`).then((r) => r.json()),
      fetch(`${API_URL}/api/forum/threads?limit=3&sort=latest`).then((r) => r.json()),
      fetch(`${API_URL}/api/social/posts?limit=3&status=published`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/team`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/sponsors`).then((r) => r.json()),
    ])
      .then(([homepageRes, eventsRes, featuredPastRes, threadsRes, socialRes, teamRes, sponsorsRes]) => {
        if (homepageRes.data) setHomepage(homepageRes.data);
        if (eventsRes.data) {
          const allEvents = eventsRes.data;
          setFeaturedEvent(allEvents[0] ?? null);
          setEvents(allEvents.slice(1, 4));
        }
        if (featuredPastRes.data) setFeaturedPastEvents(featuredPastRes.data)
        if (threadsRes.data) setThreads(threadsRes.data);
        if (socialRes.data) setSocialPosts(socialRes.data);
        if (teamRes.data) setTeamMembers(teamRes.data.slice(0, 4));
        if (sponsorsRes.data) setSponsors(sponsorsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Testimonial auto-rotate ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // ─── Newsletter submit ──────────────────────────────────────────────────────
  async function handleNewsletter(e: React.FormEvent) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setNewsletterLoading(true);
    setNewsletterError('');

    try {
      const res = await fetch(`${API_URL}/api/cms/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, name: newsletterName }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNewsletterError(json.error || 'Failed to subscribe. Please try again.');
        return;
      }
      setNewsletterSuccess(true);
    } catch {
      setNewsletterError('Something went wrong. Please try again.');
    } finally {
      setNewsletterLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ── Brutalist Grid Hero (with Advanced Ink Trail) ── */}
      <section
        className="relative bg-[#F4F4F0] min-h-screen py-16 flex flex-col items-center justify-center overflow-hidden"
      >

        {/* Base Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #00000015 1px, transparent 1px), linear-gradient(to bottom, #00000015 1px, transparent 1px)',
            backgroundSize: '100px 100px',
            backgroundPosition: '0 0'
          }}
        />

        {/* ── Ink Splat Trail Reveal Overlay ───────── */}
        <InkMaskOverlay />
        {/* ──────────────────────────────────────────── */}

        {/* Floating Abstract Elements */}
        {/* Star Top Left */}
        {/* <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute top-20 left-[12%] w-16 h-16 hidden md:block"
        >
          <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="6"><path d="M100 0L125 75L200 100L125 125L100 200L75 125L0 100L75 75Z" fill="transparent" /></svg>
        </motion.div> */}

        {/* Yellow Splat Top Right */}
        {/* <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[18%] w-16 h-16 text-[#FBBC05] drop-shadow-[4px_4px_0_rgba(0,0,0,0.1)] hidden md:block"
        >
          <svg viewBox="0 0 200 200" fill="currentColor"><path d="M108.5 2C130.5 -4 153.5 6 166.5 24C179.5 42 182.5 67 194.5 89C206.5 111 227.5 130 219.5 151C211.5 172 174.5 185 151.5 197C128.5 209 119.5 220 98.5 220C77.5 220 64.5 209 43.5 195C22.5 181 3.5 164 0.5 142C-2.5 120 7.5 93 14.5 70C21.5 47 25.5 28 41.5 14C57.5 0 86.5 8 108.5 2Z" /></svg>
        </motion.div> */}

        {/* Green shape Middle Left */}
        {/* <motion.div
          initial={{ x: -10 }} animate={{ x: 10 }} transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute bottom-32 left-[20%] hidden md:block w-12 h-10 drop-shadow-[2px_2px_0_#000]"
        >
          <div className="flex">
            <div className="w-6 h-12 bg-[#34A853] rounded-l-full"></div>
            <div className="w-6 h-12 bg-[#34A853] rounded-l-full -ml-[0.1rem]"></div>
            <div className="w-6 h-12 bg-[#34A853] rounded-l-full -ml-[0.1rem]"></div>
          </div>
        </motion.div> */}

        {/* Blue Globe Bottom Left */}
        {/* <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-16 left-[28%] w-10 h-10 rounded-full border-2 border-foreground bg-[#4285F4] shadow-brutal hidden md:block"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-foreground opacity-60"><path d="M50 0 A 50 50 0 1 0 100 50" fill="none" stroke="currentColor" strokeWidth="3" /><line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" /><line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="3" /><ellipse cx="50" cy="50" rx="20" ry="50" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
        </motion.div> */}

        {/* Disha Card (Bottom Left) */}
        {/* <motion.div
          initial={{ rotate: -5, y: 50, opacity: 0 }}
          animate={{ rotate: -5, y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-10 left-[10%] hidden lg:block"
        >
          <div className="w-20 bg-[#FBBC05] border-2 border-foreground rounded-xl shadow-brutal overflow-hidden">
            <div className="h-20 bg-[#FBBC05] flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center"><svg width="40" height="40" viewBox="0 0 200 200"><path fill="#EA4335" d="M100 0L125 75L200 100L125 125L100 200L75 125L0 100L75 75Z" /></svg></div>
              <div className="relative z-10 w-16 h-16 rounded-full overflow-hidden border-2 border-foreground bg-white">
                <img src="https://i.pravatar.cc/150?img=47" className="w-full h-full object-cover" alt="Student" />
              </div>
            </div>
            <div className="bg-[#34A853] py-1 text-center border-t-2 border-foreground text-white font-black tracking-widest text-xs">DISHA</div>
          </div>
        </motion.div> */}

        {/* Elya Card (Bottom Right) */}
        {/* <motion.div
          initial={{ rotate: 10, y: 50, opacity: 0 }}
          animate={{ rotate: 10, y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute bottom-12 right-[10%] hidden lg:block"
        >
          <div className="w-24 bg-[#EA4335] border-2 border-foreground rounded-t-full rounded-b-xl shadow-brutal overflow-hidden pt-3 px-2 pb-2">
            <div className="h-24 bg-[#EA4335] rounded-t-full flex items-center justify-center relative">
              <div className="absolute text-[#FBBC05] top-2 text-xl">✦</div>
              <div className="relative z-10 w-20 h-22 overflow-hidden rounded-b-xl">
                <img src="https://i.pravatar.cc/150?img=11" className="w-full h-full object-cover grayscale" alt="Student" />
              </div>
            </div>
            <div className="text-center text-white font-black tracking-widest text-xs mt-2 mb-1">ELYA</div>
          </div>
        </motion.div> */}


        <div className="relative z-10 max-w-[900px] mx-auto px-4 text-center flex flex-col items-center mt-6">

          <h1
            style={{ WebkitMaskImage: 'url(#hide-text-mask)', maskImage: 'url(#hide-text-mask)' }}
            className={`text-[3rem] sm:text-[4rem] md:text-[5.5rem] font-black uppercase tracking-tighter text-foreground leading-[0.4] py-8 select-none w-full grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4 mb-[-2rem] sm:mb-[-3rem] md:mb-[-4rem] ${antonio.className}`}
          >
            {/* Line 1: COME | TO | LEARN. */}
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-right">
              COME
            </motion.span>
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-center">
              TO
            </motion.span>
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="text-left">
              LEARN.
            </motion.span>

            {/* Line 2: STAY | TO | [ANIMATED] */}
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-right">
              STAY
            </motion.span>
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-center">
              TO
            </motion.span>
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-left flex items-center h-full w-full">
              <span className="flex items-center relative h-[1.7em] w-full overflow-hidden" style={{ color: ['#EA4335', '#4285F4', '#FBBC05', '#34A853'][wordIndex % 4] }}>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.4, stiffness: 100 }}
                    className="absolute inset-0 flex items-center justify-start whitespace-nowrap leading-none pt-[0.0em]"
                  >
                    {words[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ WebkitMaskImage: 'url(#hide-text-mask)', maskImage: 'url(#hide-text-mask)' }}
            className="mt-6 text-base sm:text-lg font-normal max-w-xl mx-auto text-gray-700 tracking-wide relative z-10 text-center px-4 py-1"
          >
            Real projects. Real people. Real fun.
          </motion.p>

          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}
            className="mt-6 relative z-10 flex justify-center"
          >
            <Magnetic>
              <Link
                href="/events"
                className="inline-flex items-center gap-4 px-2 py-2 pr-2 pl-6 sm:pl-8 bg-[#F4F4F0] border-[3px] border-foreground rounded-full shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-1 hover:-translate-x-1 active:shadow-none active:translate-y-1 active:translate-x-1 transition-all group"
              >
                <span className="font-black uppercase tracking-widest text-base sm:text-lg text-foreground">
                  EXPLORE EVENTS
                </span>
                <span className="bg-[#FBBC05] border-2 border-foreground px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full text-foreground group-hover:bg-[#4285F4] group-hover:text-white transition-colors">
                  FREE TO JOIN
                </span>
              </Link>
            </Magnetic>
          </motion.div>
        </div>
      </section>

      <motion.section 
        ref={identitySectionRef}
        style={{ 
          opacity: waveOpacity,
          translateY: waveRevealY,
          clipPath: "ellipse(150% 100% at 50% 100%)" 
        }}
        className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden pt-48 pb-32 md:pt-64 md:pb-40 z-[20] -mt-32"
      >
        {/* Abstract Brutalist Grid overlay synced to 100px Hero grid (origin top-left) */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:100px_100px] bg-top-left"></div>
        
        {/* High-Performance Wavy Mask Reveal Logic */}
        <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden -translate-y-full pointer-events-none">
          <svg viewBox="0 0 1440 320" className="w-full h-full fill-slate-900 scale-y-[-1]">
             <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,186.7C960,192,1056,160,1152,144C1248,128,1344,128,1392,128L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            {/* Left Column: Identity */}
            <div className="w-full lg:w-[40%] flex flex-col items-center lg:items-start text-center lg:text-left">
              <div className="h-2 w-24 flex mb-8 rounded-none overflow-hidden border-2 border-black shadow-[3px_3px_0_#000]">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              
              <h2 className={`text-4xl sm:text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-6 ${antonio.className}`}>
                <span className="text-white">WHO</span><br />
                <span className="text-[#34A853]">WE ARE</span>
              </h2>

              <div className="max-w-md space-y-4 mb-8">
                <p className="text-lg sm:text-xl font-bold text-white leading-tight italic">
                  "A community of student builders at UIT University Karachi."
                </p>
                <p className="text-sm font-medium text-gray-300 leading-relaxed">
                  GDGOC-UITU is a Google Developer Group on Campus where passion meets technology. We bridge the gap between theory and practice through high-impact workshops, competitive hackathons, and a peer-driven learning ecosystem.
                </p>
              </div>

              {/* Social Links Row */}
              <div className="flex items-center gap-3 mb-8">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white border-[2.5px] border-black rounded-lg flex items-center justify-center hover:bg-[#FFED00] hover:-translate-y-1 hover:-translate-x-1 shadow-[3px_3px_0_#000] hover:shadow-[5px_5px_0_#000] active:shadow-none active:translate-y-1 active:translate-x-1 transition-all group"
                    title={social.platform}
                  >
                    <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
                      <path d={social.icon} />
                    </svg>
                  </a>
                ))}
              </div>

              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-3 px-8 py-3.5 bg-[#FBBC05] rounded-full border-[3px] border-black text-black font-black uppercase tracking-widest shadow-[6px_6px_0_#000] hover:bg-[#EA4335] hover:text-white hover:shadow-[8px_8px_0_#000] hover:-translate-y-1 active:shadow-[2px_2px_0_#000] active:translate-y-1 transition-all group text-sm"
              >
                Learn More About Us
                <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Right Column: High-Impact Carousel */}
            <div className="w-full lg:w-[55%] relative flex flex-col items-center">
              <div className="relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[1.4/1] bg-white border-[3px] border-black rounded-[2.5rem] overflow-hidden shadow-[16px_16px_0_#000] group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeFeatureIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={FEATURE_SLIDES[activeFeatureIndex].image} 
                      alt={FEATURE_SLIDES[activeFeatureIndex].title} 
                      className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    />
                    
                    {/* Dark Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    
                    {/* Content Inside Image */}
                    <div className="absolute bottom-10 left-10 right-10 z-20">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <span 
                          className="inline-block px-4 py-1.5 rounded-full border-2 border-black text-black text-xs font-black uppercase tracking-widest mb-4 shadow-[4px_4px_0_#000]"
                          style={{ backgroundColor: FEATURE_SLIDES[activeFeatureIndex].color }}
                        >
                          CORE PILLAR
                        </span>
                        <h3 className={`text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-3 ${antonio.className}`}>
                          {FEATURE_SLIDES[activeFeatureIndex].title}
                        </h3>
                        <p className="max-w-md text-base sm:text-lg font-bold text-gray-200 leading-tight">
                          {FEATURE_SLIDES[activeFeatureIndex].description}
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Progress Indicators */}
                <div className="absolute top-10 left-10 right-10 flex gap-2 z-30">
                  {FEATURE_SLIDES.map((_, i) => (
                    <div 
                      key={i} 
                      className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden"
                    >
                      <motion.div
                        className="h-full bg-white"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: i === activeFeatureIndex ? "100%" : i < activeFeatureIndex ? "100%" : "0%" 
                        }}
                        transition={{ duration: i === activeFeatureIndex ? 5 : 0.5, ease: "linear" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Centering Helper (Invisible on Desktop, Spacing on Mobile) */}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Upcoming Events: Sticky Reveal ── */}
      {!loading && (featuredEvent || events.length > 0) && (() => {
        const combinedEvents = [...(featuredEvent ? [featuredEvent] : []), ...events].filter((e, idx, self) => self.findIndex(t => t.event_id === e.event_id) === idx);
        const activeHoverEvent = combinedEvents[activeEventIndex] || combinedEvents[0];

        if (combinedEvents.length === 0) return null;

        return (
          <section className="pt-12 pb-32 bg-[#000] relative border-b-[3px] border-black text-white">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 w-full flex flex-col md:flex-row gap-16 lg:gap-24">
              
              {/* Left Column: Sticky Reveal Card */}
              <div className="w-full md:w-[45%] md:sticky md:top-28 self-start h-fit">
                {/* The Sticky Image Reveal */}
                <Link href={`/events/${activeHoverEvent?.event_id}`} className="block relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] w-full max-h-[calc(100vh-160px)] bg-[#111] border-[4px] border-white/10 rounded-[3rem] overflow-hidden group shadow-[20px_20px_60px_rgba(0,0,0,0.8)]">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeHoverEvent?.event_id}
                      src={activeHoverEvent?.banner_url || "https://placehold.co/600x800/EA4335/FFF?text=GDG+EVENT"}
                      initial={{ opacity: 0, scale: 1.1, filter: "grayscale(1) contrast(1.2)" }}
                      animate={{ opacity: 1, scale: 1, filter: "grayscale(0) contrast(1)" }}
                      exit={{ opacity: 0, scale: 0.95, filter: "grayscale(1)" }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </AnimatePresence>
                  
                  {/* Image Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                  
                  <div className="absolute bottom-8 left-8 right-8 z-20">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-4 py-1.5 bg-[#FBBC05] text-black text-xs font-black uppercase tracking-widest rounded-full border-2 border-black">
                        {activeHoverEvent?.category_name || 'General'}
                      </span>
                      <span className="text-white/60 text-xs font-black uppercase tracking-widest px-1">
                        {activeHoverEvent?.is_free ? 'Free' : 'Premium'}
                      </span>
                    </div>
                    <h3 className={`text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-[0.9] ${antonio.className}`}>
                      {activeHoverEvent?.title}
                    </h3>
                  </div>

                  {/* Absolute date badge */}
                  <div className="absolute top-8 right-8 bg-[#EA4335] border-[3px] border-black rounded-3xl w-24 h-24 flex flex-col items-center justify-center shadow-[6px_6px_0_#000] -rotate-6 group-hover:rotate-0 transition-transform duration-500">
                    <span className="text-xs font-black text-white uppercase mb-1">
                      {activeHoverEvent?.start_datetime ? new Date(activeHoverEvent.start_datetime).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}
                    </span>
                    <span className="text-4xl font-black text-white leading-none tracking-tighter">
                      {activeHoverEvent?.start_datetime ? new Date(activeHoverEvent.start_datetime).toLocaleDateString('en-US', { day: '2-digit' }) : '??'}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Right Column: Scrolling Event List */}
              <div className="w-full md:w-[55%] flex flex-col pt-4 md:pt-8 lg:pt-12 pb-16">
                {/* Mobile/Right-column Header (duplicated for balance) */}
                <div className="space-y-6 mb-20">
                  <h2 className={`text-5xl sm:text-7xl lg:text-[7.5rem] font-black uppercase tracking-tighter leading-[0.8] ${antonio.className}`}>
                    <span className="text-[#FBBC05] italic drop-shadow-[4px_4px_0_#fff]">UPCOMING!</span><br />
                    <span className="text-white">EVENTS?</span>
                  </h2>
                  <p className="text-gray-400 text-lg font-bold tracking-tight max-w-sm">
                    Don't miss out on the most impactful technical sessions in the city.
                  </p>
                  
                  <Link 
                    href="/events" 
                    className="inline-flex h-14 items-center px-8 bg-[#FBBC05] border-[3px] border-black rounded-full text-black text-sm font-black uppercase tracking-widest shadow-[6px_6px_0_#fff] hover:shadow-[3px_3px_0_#fff] hover:translate-x-1 hover:translate-y-1 transition-all group"
                  >
                    View All Events
                    <svg className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                <div className="flex flex-col border-t-[1px] border-white/20">
                  {combinedEvents.map((event, idx) => (
                    <Link
                      key={event.event_id}
                      href={`/events/${event.event_id}`}
                      onMouseEnter={() => setActiveEventIndex(idx)}
                      onFocus={() => setActiveEventIndex(idx)}
                      className="group relative flex flex-col sm:flex-row sm:items-center justify-between py-10 sm:py-14 border-b-[1px] border-white/20 hover:bg-white/[0.03] transition-colors cursor-pointer group/item text-white"
                    >
                      <div className="space-y-4 max-w-[80%]">
                        <div className="flex items-center gap-4">
                          <span className="text-[#FBBC05] text-xs font-black uppercase tracking-[0.2em]">
                            {event.category_name || 'Tech'}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          <span className="text-white/40 text-xs font-black uppercase tracking-[0.2em]">
                           {event.venue || 'Online'}
                          </span>
                        </div>
                        
                        <h3 className={`text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[0.85] group-hover/item:text-[#FBBC05] transition-colors ${antonio.className} ${activeEventIndex === idx ? 'text-[#FBBC05]' : 'text-white'}`}>
                          {event.title}
                        </h3>
                      </div>

                      {/* Right Hand: Action & Arrow */}
                      <div className="flex flex-col items-end gap-6 mt-8 sm:mt-0">
                         <div className="w-12 h-12 rounded-full border-2 border-white/20 flex items-center justify-center text-white group-hover/item:border-[#FBBC05] group-hover/item:text-[#FBBC05] transition-all group-hover/item:-translate-y-1 group-hover/item:translate-x-1">
                           <svg className="w-6 h-6 rotate-[-45deg] group-hover/item:rotate-0 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7M21 12H3" />
                           </svg>
                         </div>
                         <div className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] group-hover/item:text-white/60 transition-colors">
                           View Event &nbsp;→
                         </div>
                      </div>
                    </Link>
                  ))}
                </div>
                
                {/* Bottom CTA */}
                <div className="py-20 flex flex-col items-center text-center space-y-8 border-t-[1px] border-white/20 mt-10">
                   <h4 className={`text-4xl font-black text-white italic uppercase tracking-tighter ${antonio.className}`}>
                      Want to host an event?
                   </h4>
                   <Link href="/about" className="text-[#FBBC05] font-black uppercase tracking-widest text-sm hover:underline underline-offset-8 decoration-2">
                     Get in touch with the lead →
                   </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Featured Past Events ── */}
      {!loading && featuredPastEvents.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
                  <div className="flex-1 bg-[#4285F4]" />
                  <div className="flex-1 bg-[#EA4335]" />
                  <div className="flex-1 bg-[#FBBC05]" />
                  <div className="flex-1 bg-[#34A853]" />
                </div>
                <h2 className={`text-2xl font-bold text-gray-900 tracking-tight ${antonio.className}`}>
                  Our Best Events
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Highlights from our most impactful events
                </p>
              </div>
              <Link
                href="/events?status=past"
                className="text-sm font-semibold text-[#4285F4] hover:underline"
              >
                View Past Events →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPastEvents.map((event, index) => {
                const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];
                const color = colors[index % colors.length];
                return (
                  <div
                    key={event.id}
                    className={`group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col ${event.event_id ? 'cursor-pointer' : ''
                      }`}
                    onClick={() => {
                      if (event.event_id) {
                        window.location.href = `/events/${event.event_id}`;
                      }
                    }}
                  >
                    {/* Color accent top bar */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: color }} />

                    {/* Image or placeholder */}
                    <div className="relative h-44 overflow-hidden" style={{ backgroundColor: `${color}15` }}>
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div
                              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-2"
                              style={{ backgroundColor: `${color}25` }}
                            >
                              <svg
                                className="w-8 h-8"
                                style={{ color }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Category badge */}
                      {event.category && (
                        <div className="absolute top-3 left-3">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {event.category}
                          </span>
                        </div>
                      )}

                      {/* Linked event badge */}
                      {event.event_id && (
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 shadow-sm border border-gray-100">
                            View Event →
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className={`font-bold text-gray-900 text-base leading-snug group-hover:text-[#4285F4] transition-colors mb-2 ${antonio.className}`}>
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 flex-1">
                          {event.description}
                        </p>
                      )}

                      {event.event_date && (
                        <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(event.event_date).toLocaleDateString('en-PK', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Technologies We Cover ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden mx-auto">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
            <h2 className={`text-2xl font-bold text-gray-900 tracking-tight ${antonio.className}`}>Technologies We Cover</h2>
            <p className="text-sm text-gray-500 mt-2">From mobile to cloud — we cover the full stack</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TECHNOLOGIES.map((tech) => (
              <div
                key={tech.name}
                className="group p-5 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all text-center cursor-default"
              >
                <div className="text-3xl mb-2">{tech.icon}</div>
                <div
                  className="w-8 h-1 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: tech.color }}
                />
                <p className="text-sm font-semibold text-gray-800">{tech.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section >

      {/* ── Latest Forum Discussions ── */}
      {
        !loading && threads.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
                    <div className="flex-1 bg-[#4285F4]" />
                    <div className="flex-1 bg-[#EA4335]" />
                    <div className="flex-1 bg-[#FBBC05]" />
                    <div className="flex-1 bg-[#34A853]" />
                  </div>
                  <h2 className={`text-2xl font-bold text-gray-900 tracking-tight ${antonio.className}`}>Latest Discussions</h2>
                  <p className="text-sm text-gray-500 mt-1">Join the conversation in our community forum</p>
                </div>
                <Link href="/forum" className="text-sm font-semibold text-[#4285F4] hover:underline">
                  View All →
                </Link>
              </div>

              <div className="space-y-3">
                {threads.map((thread) => (
                  <Link key={thread.thread_id} href={`/forum/${thread.thread_id}`}>
                    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(thread.author_name || 'U')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: `#${thread.category_color}` }}
                            >
                              {thread.category_name}
                            </span>
                            <span className="text-xs text-gray-400">{timeAgo(thread.created_at)}</span>
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                            {thread.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{thread.body_preview}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>{thread.author_name}</span>
                            <span>{thread.reply_count} replies</span>
                            <span>{thread.upvote_count} upvotes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/forum/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Start a Discussion
                </Link>
              </div>
            </div>
          </section>
        )
      }

      {/* ── Testimonials ── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-1 w-12 flex mb-6 rounded-full overflow-hidden mx-auto">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h2 className={`text-2xl font-bold text-white tracking-tight mb-12 ${antonio.className}`}>What Our Members Say</h2>

          <div className="relative">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.id}
                className={`transition-all duration-500 ${i === activeTestimonial ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 translate-y-4'
                  }`}
              >
                <div className="bg-white bg-opacity-10 border border-white border-opacity-10 rounded-2xl p-8">
                  <p className="text-lg text-white leading-relaxed italic">
                    "{t.quote}"
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(t.name)}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-blue-300 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`rounded-full transition-all ${i === activeTestimonial ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white bg-opacity-30'
                  }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Media Feed ── */}
      {
        !loading && socialPosts.length > 0 && (
          <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
                    <div className="flex-1 bg-[#4285F4]" />
                    <div className="flex-1 bg-[#EA4335]" />
                    <div className="flex-1 bg-[#FBBC05]" />
                    <div className="flex-1 bg-[#34A853]" />
                  </div>
                  <h2 className={`text-2xl font-bold text-gray-900 tracking-tight ${antonio.className}`}>From Our Socials</h2>
                  <p className="text-sm text-gray-500 mt-1">Stay up to date with what we're sharing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {socialPosts.map((post) => {
                  const config = PLATFORM_CONFIG[post.platform] ?? { color: '#4285F4', label: post.platform };
                  return (
                    <div key={post.post_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">

                      {/* Media */}
                      {post.media_urls && post.media_urls.length > 0 && (
                        <div className="h-48 bg-gray-100 overflow-hidden">
                          <img
                            src={post.media_urls[0]}
                            alt="Post media"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}

                      <div className="p-4 flex flex-col flex-1">
                        {/* Platform badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className="px-2.5 py-1 rounded-full text-xs font-bold text-white capitalize"
                            style={{ backgroundColor: config.color }}
                          >
                            {config.label}
                          </span>
                          {post.posted_at && (
                            <span className="text-xs text-gray-400">{timeAgo(post.posted_at)}</span>
                          )}
                        </div>

                        {/* Caption */}
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 flex-1">
                          {post.caption}
                        </p>

                        {/* Hashtags */}
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {post.hashtags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs text-blue-500">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )
      }

      {/* ── Brutalist Team Preview ── */}
      {
        !loading && teamMembers.length > 0 && (
          <section className="py-24 bg-[#F4F4F0] border-t-[3px] border-black relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px] opacity-60 pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 font-sans">

              {/* Brutalist Section Header */}
              <div className="flex flex-col items-center justify-center mb-20 text-center">
                <h2 className={`text-[3.5rem] sm:text-[5rem] font-black uppercase tracking-tighter text-foreground leading-[0.8] mb-6 ${antonio.className}`}>
                  MEET THE <span className="text-[#EA4335]">TEAM</span>
                </h2>
                <div className="inline-block bg-[#FFED00] border-[3px] border-black px-5 py-2 -rotate-2 shadow-[6px_6px_0_#000]">
                  <p className="font-bold text-sm sm:text-base uppercase tracking-wider">The builders behind GDGOC-UITU!</p>
                </div>
              </div>

              {/* Brutalist 2-Column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 max-w-4xl mx-auto">
                {teamMembers
                  .sort((a, b) => a.display_order - b.display_order)
                  .slice(0, 2)
                  .map((member, idx) => (
                    <BrutalistMemberCard
                      key={member.member_id}
                      member={member}
                      index={idx}
                      actionLabel="VIEW PROFILE"
                      actionHref="/about"
                    />
                  ))}
              </div>

              {/* View All Team Link */}
              <div className="mt-16 flex justify-center">
                <Link href="/about" className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-black uppercase border-b-[4px] border-black pb-1 hover:text-[#EA4335] hover:border-[#EA4335] transition-colors group">
                  MEET THE FULL TEAM
                  <span className="group-hover:translate-x-3 transition-transform">→</span>
                </Link>
              </div>

            </div>
          </section>
        )
      }

      {/* ── Sponsors Strip ── */}
      {
        !loading && sponsors.length > 0 && (
          <section className="py-14 bg-white border-t border-gray-100">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-8">
                Supported By
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {sponsors.map((sponsor) => (
                  <a
                    key={sponsor.sponsor_id}
                    href={sponsor.website_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="h-10 w-auto object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all"
                      />
                    ) : (
                      <span className="text-sm font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                        {sponsor.name}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )
      }

      {/* ── Newsletter + Join CTA ── */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Join CTA */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col justify-between">
              <div>
                <div className="h-1 w-12 flex mb-4 rounded-full overflow-hidden">
                  <div className="flex-1 bg-[#4285F4]" />
                  <div className="flex-1 bg-[#EA4335]" />
                  <div className="flex-1 bg-[#FBBC05]" />
                  <div className="flex-1 bg-[#34A853]" />
                </div>
                <h2 className={`text-2xl font-bold text-gray-900 tracking-tight ${antonio.className}`}>
                  Ready to Join?
                </h2>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                  Become part of a growing community of student developers at UIT University.
                  Register for free and start your journey today.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-xl bg-[#4285F4] text-white font-bold text-sm hover:bg-blue-600 transition-all shadow-md hover:shadow-blue-200 text-center"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/about"
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:border-blue-300 hover:text-blue-600 transition-all text-center"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Newsletter */}
            <div className="bg-[#4285F4] rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200 mb-3">
                  Newsletter
                </p>
                <h2 className={`text-2xl font-bold text-white tracking-tight ${antonio.className}`}>
                  Stay in the Loop
                </h2>
                <p className="mt-3 text-sm text-blue-100 leading-relaxed">
                  Get notified about upcoming events, workshops, and community updates. No spam, ever.
                </p>
              </div>

              {newsletterSuccess ? (
                <div className="mt-6 p-4 rounded-xl bg-white bg-opacity-15 border border-white border-opacity-20 text-center">
                  <p className="text-white font-semibold text-sm">🎉 You're subscribed!</p>
                  <p className="text-blue-200 text-xs mt-1">We'll keep you in the loop.</p>
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="mt-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={newsletterName}
                    onChange={(e) => setNewsletterName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white bg-opacity-15 border border-white border-opacity-25 text-white placeholder-blue-200 text-sm outline-none focus:bg-opacity-20 transition-all"
                  />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white bg-opacity-15 border border-white border-opacity-25 text-white placeholder-blue-200 text-sm outline-none focus:bg-opacity-20 transition-all"
                  />
                  {newsletterError && (
                    <p className="text-red-300 text-xs">{newsletterError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={newsletterLoading}
                    className="w-full py-2.5 rounded-xl bg-white text-[#4285F4] font-bold text-sm hover:bg-gray-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {newsletterLoading ? 'Subscribing...' : 'Subscribe for Free'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-gray-400 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
            <div className="sm:col-span-2">
              <div className="flex items-center mb-3">
                <img
                  src="/images/GDGOC-UITU%20LOGO(1).png"
                  alt="GDGOC-UITU Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <p className="text-xs leading-relaxed max-w-xs">
                Google Developer Groups on Campus at UIT University Karachi. Building the next generation of developers.
              </p>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wide mb-3">Platform</p>
              <div className="space-y-2">
                {[
                  { label: 'Events', href: '/events' },
                  { label: 'Forum', href: '/forum' },
                  { label: 'Team', href: '/about' },
                  { label: 'Sponsors', href: '/sponsors' },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white text-xs font-bold uppercase tracking-wide mb-3">Company</p>
              <div className="space-y-2">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Join Us', href: '/register' },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-xs hover:text-white transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs">© 2026 GDGOC-UITU. All rights reserved.</p>
            <div className="h-0.5 w-8 flex rounded-full overflow-hidden">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
          </div>
        </div>
      </footer>

    </div >
  );
}