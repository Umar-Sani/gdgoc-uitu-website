'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Magnetic from '../../components/ui/magnetic';
import PuzzleImage from '../../components/ui/PuzzleImage';
import WhoWeAre from '../../components/ui/WhoWeAre';
import UpcomingEvents from '../../components/ui/UpcomingEvents';
import PastEventsShowcase from '../../components/ui/PastEventsShowcase';
import TechnologiesGrid from '../../components/ui/TechnologiesGrid';
import { Antonio } from 'next/font/google';
import MascotBanner from '../../components/ui/MascotBanner';
import ParallaxBackdrop from '../../components/ui/ParallaxBackdrop';
import { useAuth } from '@/context/AuthContext';

const antonio = Antonio({ subsets: ['latin'] });

// Register GSAP Plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
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

type Participant = {
  name: string;
  avatar: string | null;
  username: string;
};

type Thread = {
  thread_id: string;
  title: string;
  body_preview: string;
  category_name: string;
  category_color: string;
  tags: string[];
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  last_reply_at: string | null;
  participants: Participant[];
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

type Testimonial = {
  testimonial_id: string;
  author_name: string;
  author_role: string | null;
  quote: string;
  avatar_url: string | null;
  display_order: number;
};

// ─── Team card themes (mirrors TeamCards.tsx THEMES) ─────────────────────────

const TEAM_THEMES = [
  { solid: '#4285F4', gradient: 'linear-gradient(135deg, #5a9bff, #3474d4)', glow: 'rgba(66,133,244,0.55)' },
  { solid: '#EA4335', gradient: 'linear-gradient(135deg, #ff7c70, #c53026)', glow: 'rgba(234,67,53,0.55)' },
  { solid: '#FBBC05', gradient: 'linear-gradient(135deg, #ffd34d, #e0a000)', glow: 'rgba(251,188,5,0.55)' },
  { solid: '#34A853', gradient: 'linear-gradient(135deg, #4cc36a, #288a44)', glow: 'rgba(52,168,83,0.55)' },
] as const;
type TeamTheme = typeof TEAM_THEMES[number];

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

// ─── GSAP vertical loop (ported from GreenSock verticalLoop helper) ───────────
type VLoop = gsap.core.Timeline & {
  toIndex: (i: number, vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  next: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  previous: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  current: () => number;
  times: number[];
  cleanup: () => void;
};

function buildVerticalLoop(items: HTMLElement[], config: {
  paused?: boolean; center?: boolean; speed?: number;
  onChange?: (el: HTMLElement, i: number) => void;
} = {}): VLoop {
  const snap = gsap.utils.snap(1);
  const tl = gsap.timeline({
    repeat: -1, paused: config.paused, defaults: { ease: 'none' },
    onReverseComplete() { tl.totalTime(tl.rawTime() + tl.duration() * 100); },
  }) as VLoop;

  const n = items.length;
  const container = items[0].parentNode as HTMLElement;
  const heights: number[] = [];
  const yPercents: number[] = [];
  const spaceBefore: number[] = [];
  const times: number[] = [];
  let curIndex = 0;
  let timeWrap!: (v: number) => number;
  let totalHeight = 0;
  const pps = (config.speed ?? 1) * 100;
  const startY = items[0].offsetTop;

  const measure = () => {
    let b1 = container.getBoundingClientRect(), b2: DOMRect;
    items.forEach((el, i) => {
      heights[i] = parseFloat(gsap.getProperty(el, 'height', 'px') as string);
      yPercents[i] = snap(parseFloat(gsap.getProperty(el, 'y', 'px') as string) / heights[i] * 100
        + (gsap.getProperty(el, 'yPercent') as number));
      b2 = el.getBoundingClientRect();
      spaceBefore[i] = b2.top - (i ? b1.bottom : b1.top);
      b1 = b2;
    });
    gsap.set(items, { yPercent: (i: number) => yPercents[i] });
    totalHeight = items[n - 1].offsetTop
      + yPercents[n - 1] / 100 * heights[n - 1]
      - startY + spaceBefore[0]
      + items[n - 1].offsetHeight * (gsap.getProperty(items[n - 1], 'scaleY') as number);
  };

  const buildTL = () => {
    tl.clear();
    items.forEach((item, i) => {
      const curY = yPercents[i] / 100 * heights[i];
      const dStart = item.offsetTop + curY - startY + spaceBefore[0];
      const dLoop = dStart + heights[i] * (gsap.getProperty(item, 'scaleY') as number);
      tl.to(item, { yPercent: snap((curY - dLoop) / heights[i] * 100), duration: dLoop / pps }, 0)
        .fromTo(item,
          { yPercent: snap((curY - dLoop + totalHeight) / heights[i] * 100) },
          { yPercent: yPercents[i], duration: (totalHeight - dLoop) / pps, immediateRender: false },
          dLoop / pps)
        .add('label' + i, dStart / pps);
      times[i] = dStart / pps;
    });
    timeWrap = gsap.utils.wrap(0, tl.duration());
  };

  const applyOffsets = () => {
    if (!config.center) return;
    const offset = tl.duration() * (container.offsetHeight / 2) / totalHeight;
    times.forEach((_, i) => {
      times[i] = timeWrap(tl.labels['label' + i] + tl.duration() * heights[i] / 2 / totalHeight - offset);
    });
  };

  const closest = (value: number) => {
    let idx = 0, best = 1e10;
    times.forEach((t, i) => {
      let d = Math.abs(t - value);
      if (d > tl.duration() / 2) d = tl.duration() - d;
      if (d < best) { best = d; idx = i; }
    });
    return idx;
  };

  const toIndex = (index: number, vars: gsap.TweenVars = {}) => {
    if (Math.abs(index - curIndex) > n / 2) index += index > curIndex ? -n : n;
    const ni = gsap.utils.wrap(0, n, index);
    let t = times[ni];
    if ((t > tl.time()) !== (index > curIndex) && index !== curIndex) t += tl.duration() * (index > curIndex ? 1 : -1);
    if (t < 0 || t > tl.duration()) vars = { ...vars, modifiers: { time: timeWrap } };
    curIndex = ni;
    vars.overwrite = true;
    return vars.duration === 0 ? tl.time(timeWrap(t)) : tl.tweenTo(t, vars);
  };

  gsap.set(items, { y: 0 });
  measure();
  buildTL();
  applyOffsets();

  let lastIdx = 0;
  if (config.onChange) {
    const cb = config.onChange;
    tl.eventCallback('onUpdate', () => {
      const i = closest(tl.time());
      if (i !== lastIdx) { lastIdx = i; cb(items[i], i); }
    });
  }

  tl.progress(1, true).progress(0, true);

  const onResize = () => {
    const p = tl.progress();
    tl.progress(0, true);
    measure(); buildTL(); applyOffsets();
    tl.progress(p, true);
  };
  window.addEventListener('resize', onResize);

  tl.toIndex = toIndex;
  tl.next = (v?) => toIndex(curIndex + 1, v);
  tl.previous = (v?) => toIndex(curIndex - 1, v);
  tl.current = () => curIndex;
  tl.times = times;
  tl.cleanup = () => { window.removeEventListener('resize', onResize); tl.kill(); };

  (tl as any).closestIndex = (set?: boolean) => { const i = closest(tl.time()); if (set) curIndex = i; return i; };
  (tl as any).closestIndex(true);
  lastIdx = curIndex;
  config.onChange?.(items[curIndex], curIndex);

  return tl;
}

// ─── Forum thread card (mirrors the /forum Reddit-style card) ─────────────────

function preprocessMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/\B@([a-zA-Z0-9_]+)/g, '[@$1](mention:$1)');
}

const markdownComponents = {
  a: ({ href, children, ...props }: any) => {
    if (href?.startsWith('mention:')) {
      const username = href.replace('mention:', '');
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
          @{username}
        </span>
      );
    }
    return <a href={href} className="text-blue-600 hover:underline" {...props}>{children}</a>;
  },
};

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {value}
    </span>
  );
}

function ForumThreadCard({ thread }: { thread: Thread }) {
  // Detect whether the body preview overflows its clamp → show "… Read more"
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight + 4);
  }, [thread.body_preview]);

  const backendCut = (thread.body_preview?.length ?? 0) >= 150;
  const previewText = backendCut
    ? thread.body_preview.replace(/\s+\S*$/, '').trimEnd() + '…'
    : thread.body_preview;
  const hasMore = backendCut || isClamped;

  return (
    <div className="flex flex-col h-full w-full bg-white border-[2.5px] border-black rounded-xl shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[5px_5px_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_#000] transition-all p-5">

      {/* ── Author + status ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0 border-2 border-black">
          {thread.author_avatar ? (
            <img src={thread.author_avatar} alt={thread.author_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-white">{getInitials(thread.author_name)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0 flex-wrap">
          <span className="font-semibold text-gray-700 truncate">{thread.author_name}</span>
          <span className="text-gray-300">•</span>
          <span>{timeAgo(thread.created_at)}</span>
          {thread.is_pinned && (
            <span className="inline-flex items-center gap-1 text-[#34A853] font-semibold">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
              Pinned
            </span>
          )}
          {thread.is_locked && (
            <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
          )}
        </div>
      </div>

      {/* ── Heading ── */}
      <Link href={`/forum/${thread.thread_id}`} className="block group mt-3">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#4285F4] transition-colors leading-snug">
          {thread.title}
        </h3>
      </Link>

      {/* ── Category + tags ── */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white border border-black/20"
          style={{ backgroundColor: `#${thread.category_color}` }}
        >
          {thread.category_name}
        </span>
        {thread.tags?.slice(0, 4).map((tag) => (
          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
        ))}
      </div>

      {/* ── Body preview (markdown) ── */}
      <div className="relative mt-3">
        <div
          ref={bodyRef}
          className="max-h-28 overflow-hidden text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-a:text-blue-600 prose-code:text-pink-600 prose-img:rounded-lg prose-img:max-h-24 prose-img:my-1 [&_pre]:whitespace-pre-wrap [&_pre]:text-xs"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {preprocessMarkdown(previewText)}
          </ReactMarkdown>
        </div>
        {hasMore && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {hasMore && (
        <Link
          href={`/forum/${thread.thread_id}`}
          className="inline-block mt-1.5 text-xs font-semibold text-[#4285F4] hover:underline"
        >
          Read more →
        </Link>
      )}

      {/* ── Stats ── */}
      <div className="flex items-center gap-5 mt-auto pt-4 border-t-2 border-dashed border-gray-200 text-xs font-medium text-gray-500">
        <Stat
          value={thread.upvote_count}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>}
        />
        <Stat
          value={thread.reply_count}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
        <Stat
          value={thread.view_count}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
        />
        <div className="flex items-center -space-x-1.5 ml-auto">
          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden" title={thread.author_name}>
            {thread.author_avatar ? (
              <img src={thread.author_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold text-gray-600">{getInitials(thread.author_name)}</span>
            )}
          </div>
          {thread.participants?.slice(0, 4).map((p, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden" title={p.name}>
              {p.avatar ? (
                <img src={p.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-gray-600">{getInitials(p.name)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Thread focus stack: scroll-proximity magnify ─────────────────────────────
// Writes transform/opacity directly to DOM — no React state on scroll frames.
function ThreadFocusStack({ threads }: { threads: Thread[] }) {
  const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mainCount = Math.min(threads.length, 3);

  useEffect(() => {
    if (mainCount === 0) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const center = window.innerHeight / 2;
      const raw = wrapRefs.current.slice(0, mainCount).map((el) => {
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - center);
        return Math.max(0, 1 - dist / (window.innerHeight * 0.65));
      });
      const peak = Math.max(...raw, 0.001);
      wrapRefs.current.slice(0, mainCount).forEach((el, i) => {
        if (!el) return;
        const w = raw[i] / peak;
        el.style.transform = `scale(${(0.95 + 0.08 * w).toFixed(4)})`;
        el.style.opacity = (0.42 + 0.58 * w).toFixed(3);
      });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    window.addEventListener('scroll', onScroll, { passive: true });
    compute();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mainCount]);

  const mainThreads = threads.slice(0, 3);
  const ghostThread = threads[3] ?? null;

  return (
    <div className="space-y-5">
      {mainThreads.map((thread, i) => (
        <div
          key={thread.thread_id}
          ref={(el) => { wrapRefs.current[i] = el; }}
          style={{
            transform: i === 0 ? 'scale(1.03)' : 'scale(0.95)',
            opacity: i === 0 ? 1 : 0.42,
            transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.55s ease',
            willChange: 'transform, opacity',
          }}
        >
          <ForumThreadCard thread={thread} />
        </div>
      ))}

      {/* Ghost teaser → fades into the View All CTA */}
      <div className="relative mt-1 overflow-hidden rounded-xl">
        <div
          style={{
            opacity: 0.15,
            transform: 'scale(0.93)',
            filter: 'blur(1.5px)',
            pointerEvents: 'none',
            transformOrigin: 'top center',
          }}
        >
          {ghostThread ? (
            <ForumThreadCard thread={ghostThread} />
          ) : (
            <div className="h-36 bg-gray-100 rounded-xl" />
          )}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 bg-gradient-to-t from-[#F4F4F0] via-[#F4F4F0]/85 to-[#F4F4F0]/10">
          <Link
            href="/forum"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#4285F4] text-white text-sm font-black uppercase tracking-wider shadow-lg hover:bg-blue-600 hover:-translate-y-0.5 transition-all"
          >
            View All Discussions
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Mini member card (GDG-Lead style, for the landing page team showcase) ────

function MiniMemberCard({
  member,
  theme,
  isLead = false,
}: {
  member: TeamMember;
  theme: TeamTheme;
  isLead?: boolean;
}) {
  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="group flex flex-col rounded-3xl bg-white overflow-hidden hover:-translate-y-1.5 transition-all duration-300 ring-1 ring-black/5"
      style={{ boxShadow: `4px 4px 0 ${theme.solid}, 0 16px 40px -10px ${theme.glow}` }}
    >
      {/* Portrait */}
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.full_name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl font-black text-white"
            style={{ backgroundImage: theme.gradient }}
          >
            {initials(member.full_name)}
          </div>
        )}
        {isLead && (
          <span
            className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
            style={{ backgroundImage: theme.gradient, boxShadow: `0 4px 14px ${theme.glow}` }}
          >
            Lead
          </span>
        )}
      </div>
      {/* Body */}
      <div className="flex flex-col p-4">
        <h4 className="text-base font-black uppercase tracking-tight text-gray-900 leading-none truncate">
          {member.full_name}
        </h4>
        <p
          className="text-[11px] font-black uppercase tracking-wide mt-2 px-3 py-1 self-start rounded-full text-white truncate max-w-full"
          style={{ backgroundImage: theme.gradient, boxShadow: `0 4px 14px ${theme.glow}` }}
        >
          {member.role_title}
        </p>
      </div>
    </div>
  );
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
  const splatRefs = useRef<(SVGPathElement | null)[]>([]);

  // Object pooling for buttery smooth, zero-latency tracking
  const SPLAT_COUNT = 80;
  const [mounted, setMounted] = useState(false);
  const paths = useRef(Array.from({ length: SPLAT_COUNT }, () => Math.floor(Math.random() * LIQUID_SPLATS.length))).current;
  const rots = useRef(Array.from({ length: SPLAT_COUNT }, () => Math.random() * 360)).current;

  useEffect(() => {
    setMounted(true);
    let poolIdx = 0;

    const triggerSplash = (x: number, y: number, isAuto = false) => {
      poolIdx = (poolIdx + 1) % SPLAT_COUNT;
      const el = splatRefs.current[poolIdx];
      if (!el) return;

      const targetScale = isAuto ? 45.0 : (Math.random() * 3.0 + 8.0);
      const sweepDur = isAuto ? 5.0 : (Math.random() * 1.0 + 4.0);

      // Reset and animate using GSAP
      gsap.set(el, { x, y, scale: 0, rotate: rots[poolIdx] });
      gsap.to(el, {
        scale: targetScale,
        duration: sweepDur * 0.1,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(el, {
            scale: 0,
            duration: sweepDur * 0.8,
            ease: "power2.in",
            delay: sweepDur * 0.1
          });
        }
      });
    };

    const autoInterval = setInterval(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sweepSteps = 25;
      const sweepDuration = 1200;

      const topY = rect.top + rect.height * 0.25;
      for (let i = 0; i <= sweepSteps; i++) {
        setTimeout(() => {
          const xPos = rect.left + (rect.width * i / sweepSteps);
          triggerSplash(xPos, topY, true);
        }, i * (sweepDuration / sweepSteps));
      }

      const bottomY = rect.top + rect.height * 0.75;
      for (let i = 0; i <= sweepSteps; i++) {
        setTimeout(() => {
          const xPos = rect.right - (rect.width * i / sweepSteps);
          triggerSplash(xPos, bottomY, true);
        }, sweepDuration + (i * (sweepDuration / sweepSteps)) + 200);
      }
    }, 10000);

    return () => clearInterval(autoInterval);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[5] pointer-events-none overflow-hidden" style={{ WebkitMaskImage: 'url(#ink-mask)', maskImage: 'url(#ink-mask)' }}>
      {/* ── Hidden Mask Stickers ── */}
      <img src="/images/Android Guy Standing Still.png" alt="Android Standing Shadow" className="absolute left-4 sm:left-12 lg:left-32 top-1/2 -translate-y-1/2 h-48 md:h-80 w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] opacity-95 -rotate-6" />
      <img src="/images/Android WOMAN Standing Still.png" alt="Android Society Shadow" className="absolute right-4 sm:right-12 lg:right-32 top-1/2 -translate-y-1/2 h-48 md:h-80 w-auto object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.5)] opacity-95 rotate-6" />

      {/* ── Main Center Logo ── */}
      <img src="/images/google-developers-seeklogo.svg" alt="Mask Reveal Image" className="w-full h-full object-contain p-10 md:p-32 opacity-100 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] relative z-10" />

      <svg className="fixed top-0 left-0 w-full h-full pointer-events-none z-[1001] opacity-0">
        <defs>
          <mask id="ink-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100vw" height="100vh">
            <rect width="100%" height="100%" fill="black" />
            <g filter="url(#gooey)">
              {mounted && Array.from({ length: SPLAT_COUNT }).map((_, i) => (
                <path
                  key={i}
                  ref={(el) => { splatRefs.current[i] = el; }}
                  d={LIQUID_SPLATS[paths[i]]}
                  fill="white"
                  style={{ transformOrigin: 'center' }}
                />
              ))}
            </g>
          </mask>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -25" result="gooey" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

// ─── Identity Section Component (Extracted for hydration/ref stability) ──────

function IdentitySection({ activeFeatureIndex, wordIndex }: { activeFeatureIndex: number, wordIndex: number }) {
  const identitySectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(identitySectionRef.current, {
      opacity: 0,
      y: 100,
      scrollTrigger: {
        trigger: identitySectionRef.current,
        start: "top bottom",
        end: "center center",
        scrub: true
      }
    });
  }, { scope: identitySectionRef });

  const words = ['BUILDERS', 'INNOVATORS', 'CREATORS', 'LEADERS'];
  const SOCIAL_LINKS = [
    { platform: 'instagram', url: 'https://instagram.com/gdgocuitu', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
    { platform: 'twitter', url: 'https://twitter.com/gdgocuitu', icon: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
    { platform: 'linkedin', url: 'https://linkedin.com/company/gdgocuitu', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    { platform: 'facebook', url: 'https://facebook.com/gdgocuitu', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  ];

  return (
    <section
      ref={identitySectionRef}
      className="min-h-screen flex items-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden py-24 md:py-32 z-[20]"
    >
      {/* Abstract Brutalist Grid overlay synced to 100px Hero grid (origin top-left) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:100px_100px] bg-top-left"></div>

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
              <div className="absolute inset-0 carousel-container">
                {FEATURE_SLIDES.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${index === activeFeatureIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Dark Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Content Inside Image */}
                    <div className={`absolute bottom-10 left-10 right-10 z-20 transition-all duration-700 delay-300 ${index === activeFeatureIndex ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                      <span
                        className="inline-block px-4 py-1.5 rounded-full border-2 border-black text-black text-xs font-black uppercase tracking-widest mb-4 shadow-[4px_4px_0_#000]"
                        style={{ backgroundColor: slide.color }}
                      >
                        CORE PILLAR
                      </span>
                      <h3 className={`text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter leading-none mb-3 ${antonio.className}`}>
                        {slide.title}
                      </h3>
                      <p className="max-w-md text-base sm:text-lg font-bold text-gray-200 leading-tight">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Indicators */}
              <div className="absolute top-10 left-10 right-10 flex gap-2 z-30">
                {FEATURE_SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{
                        width: i === activeFeatureIndex ? "100%" : i < activeFeatureIndex ? "100%" : "0%",
                        transitionDuration: i === activeFeatureIndex ? "5s" : "0.5s",
                        transitionTimingFunction: "linear"
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Upcoming Events Component (Extracted to fix hydration/ref issues) ───────

function EventsHorizontalScroll({ events, featuredEvent, isMobile }: { events: Event[], featuredEvent: Event | null, isMobile: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eventsSectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (isMobile || !trackRef.current || !eventsSectionRef.current) return;

    const track = trackRef.current;
    const section = eventsSectionRef.current;

    const getScrollAmount = () => {
      const trackWidth = track.scrollWidth;
      return Math.max(0, trackWidth - window.innerWidth);
    };

    const st = ScrollTrigger.create({
      trigger: section,
      pin: true,
      start: "top top",
      end: () => `+=${getScrollAmount()}`,
      scrub: 1,
      invalidateOnRefresh: true,
      animation: gsap.to(track, {
        x: () => -getScrollAmount(),
        ease: "none",
      })
    });

    // Force a strict refresh after layout paint to prevent blank sections
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeout);
      st.kill();
    };
  }, { scope: containerRef, dependencies: [events, featuredEvent, isMobile] });

  const combinedEvents = [...(featuredEvent ? [featuredEvent] : []), ...events].filter((e, idx, self) => self.findIndex(t => t.event_id === e.event_id) === idx);

  // Extend the vertical scroll height based on number of items if needed, or simply let CSS handle it
  // 400vh is usually enough for 5-6 cards. We'll give it 500vh to ensure enough scroll room.
  return (
    <div ref={containerRef} className="events-scroll-wrapper w-full">
      <section ref={eventsSectionRef as any} className="h-auto md:h-screen bg-[#F4F4F0] relative overflow-hidden border-b-[3px] border-slate-900">
        {/* Background Grid synced to Hero */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:100px_100px] bg-top-left z-0"></div>

        <div className="relative h-full flex items-center overflow-hidden z-10 w-full py-24 md:py-0">
          <div
            ref={trackRef as any}
            className="flex flex-col md:flex-row flex-nowrap items-center space-y-16 md:space-y-0 md:space-x-24 px-6 md:px-0 w-full md:w-max"
          >
            {/* ── Slide 1: Intro (Centered Full Screen) ── */}
            <div className="flex-shrink-0 w-full md:w-[100vw] flex flex-col items-center justify-center text-center">
              <div className="space-y-8 flex flex-col items-center">
                <div className="h-1.5 w-20 bg-[#4285F4] rounded-full" />
                <h2 className={`text-6xl sm:text-7xl lg:text-[7rem] font-black uppercase tracking-tighter leading-[0.85] ${antonio.className}`}>
                  <span className="text-[#4285F4]">UPCOMING!</span><br />
                  <span className="text-slate-900">EVENTS?</span>
                </h2>
                <p className="text-gray-600 text-xl font-bold tracking-tight max-w-sm">
                  Don't miss out on the most impactful technical sessions in the city.
                </p>

                <Link
                  href="/events"
                  className="inline-flex h-16 items-center bg-white rounded-full text-slate-900 text-sm font-black uppercase tracking-widest hover:-translate-y-1 transition-transform border-[3px] border-slate-900 shadow-[6px_6px_0_#0f172a] p-1.5 group mx-auto"
                >
                  <span className="px-6">Explore More</span>
                  <div className="h-full px-4 bg-[#4285F4] border-[2px] border-slate-900 rounded-full flex items-center justify-center text-xs shadow-[2px_2px_0_#0f172a] group-hover:bg-[#34A853] text-white transition-colors uppercase leading-none">
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── Slide 2..N: Event Cards ── */}
            {combinedEvents.length > 0 ? (
              combinedEvents.map((event, idx) => (
                <div
                  key={event.event_id}
                  className="flex-shrink-0 w-full md:w-[360px]"
                >
                  <Link href={`/events/${event.event_id}`} className="group block relative aspect-[4/5] bg-slate-900 border-[3px] border-slate-900 rounded-[2rem] overflow-hidden shadow-[8px_8px_0_#0f172a] hover:shadow-[4px_4px_0_#0f172a] hover:-translate-y-1 hover:translate-x-1 transition-all duration-300">
                    {/* Image Background */}
                    <div className="absolute inset-0">
                      <img
                        src={event.banner_url || "https://placehold.co/600x800/4285F4/FFF?text=GDG+EVENT"}
                        alt={event.title}
                        className="w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-40 transition-all duration-700"
                      />
                      {/* Gradient for base text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Top Elements (Always visible) */}
                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-10">
                      <div className="flex flex-col gap-2">
                        <span className="px-3 py-1 bg-[#4285F4] text-white text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-slate-900 shadow-[2px_2px_0_#0f172a]">
                          {event.category_name || 'General'}
                        </span>
                      </div>

                      <div className="bg-[#EA4335] border-2 border-slate-900 rounded-xl w-14 h-14 flex flex-col items-center justify-center shadow-[4px_4px_0_#0f172a] rotate-3 group-hover:rotate-0 transition-transform">
                        <span className="text-[9px] font-black text-white uppercase leading-none mt-1">
                          {event.start_datetime ? new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short' }) : 'TBA'}
                        </span>
                        <span className="text-xl font-black text-white leading-none">
                          {event.start_datetime ? new Date(event.start_datetime).toLocaleDateString('en-US', { day: '2-digit' }) : '??'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Content Area */}
                    <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end z-20 h-full">
                      {/* Title & Details Container */}
                      <div className="transform translate-y-36 group-hover:translate-y-0 transition-transform duration-500 ease-out flex flex-col">

                        <h3 className={`text-2xl sm:text-3xl font-black text-white uppercase tracking-tight leading-[0.9] ${antonio.className} line-clamp-2`}>
                          {event.title}
                        </h3>

                        <div className="w-12 h-1 bg-[#FBBC05] mt-4 mb-4 opacity-100 group-hover:opacity-0 transition-opacity duration-300" />

                        {/* Hidden Details (Reveal on Hover) */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-bold text-gray-300 mb-6 border-t-2 border-white/20 pt-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Time</span>
                              <span className="text-white">{event.start_datetime ? formatTime(event.start_datetime) : 'TBA'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Location</span>
                              <span className="text-white truncate pr-2" title={event.venue || 'Online'}>{event.venue || 'Online'}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Entry</span>
                              <span className="text-white">{event.is_free ? 'Free' : `Rs. ${event.ticket_price || 0}`}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Status</span>
                              <span className={event.seats_available > 0 ? 'text-[#34A853]' : 'text-[#EA4335]'}>
                                {event.seats_available > 0 ? `${event.seats_available} Seats` : 'Sold Out'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-black text-white uppercase tracking-widest pt-3 border-t-2 border-white/10">
                            <span className="flex items-center gap-2">VIEW DETAILS <div className="w-8 h-[2px] bg-white transition-all group-hover:w-12 group-hover:bg-[#4285F4]" /></span>
                            <span className="text-[#FBBC05] flex items-center group/rsvp">RSVP <svg className="w-4 h-4 ml-1 group-hover/rsvp:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7M21 12H3" /></svg></span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="flex-shrink-0 w-full md:w-[360px]">
                <div className="relative aspect-[4/5] bg-white border-[3px] border-slate-900 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center shadow-[8px_8px_0_#0f172a]">
                  <div className="w-20 h-20 bg-[#FBBC05] border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                    <svg className="w-10 h-10 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className={`text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4 ${antonio.className}`}>
                    Still Cooking...
                  </h3>
                  <p className="text-slate-600 font-bold text-sm leading-relaxed px-4">
                    Looks like we're still cooking something amazing. Come back later for new events!
                  </p>
                  <div className="mt-8 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-[#EA4335] animate-bounce delay-100" />
                    <div className="w-2 h-2 rounded-full bg-[#FBBC05] animate-bounce delay-200" />
                    <div className="w-2 h-2 rounded-full bg-[#34A853] animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Slide Final: CTA ── */}
            <div className="flex-shrink-0 w-full md:w-[360px]">
              <div className="relative p-10 md:p-12 bg-[#F4F4F0] border-[3px] border-slate-900 rounded-[2rem] shadow-[8px_8px_0_#0f172a] hover:shadow-[4px_4px_0_#0f172a] hover:-translate-y-1 hover:translate-x-1 transition-all duration-300 space-y-8 aspect-[4/5] flex flex-col justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#4285F4] border-2 border-slate-900 flex items-center justify-center shadow-[4px_4px_0_#0f172a]">
                  <svg className="w-8 h-8 text-white rotate-[-45deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7M21 12H3" />
                  </svg>
                </div>
                <div>
                  <h4 className={`text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-[0.9] mb-4 ${antonio.className}`}>
                    Want to host<br />an event?
                  </h4>
                  <p className="text-gray-600 font-bold max-w-xs leading-snug">
                    Have an idea for a workshop or talk? Let's make it happen. Reach out to our leads.
                  </p>
                </div>
                <Link
                  href="/about"
                  className="inline-flex h-12 w-max items-center px-6 bg-slate-900 text-[#F4F4F0] border-[2px] border-slate-900 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#FBBC05] hover:text-slate-900 transition-all shadow-[4px_4px_0_#4285F4] group"
                >
                  Get in touch
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Spacer to center the last card at the end of scroll */}
            {!isMobile && <div className="flex-shrink-0 w-[calc(50vw-180px)]" />}

          </div>
        </div>
      </section>
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
  const heroRef = useRef<HTMLElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const baseWords = ["BUILD", "SHIP", "GROW", "LEAD", "HACK", "CODE", "WIN", "SHINE"];
  // Append first word to end for seamless looping
  const words = [...baseWords, baseWords[0]];
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);

  // Hero Animations
  useGSAP(() => {
    const tl = gsap.timeline();

    // Initial entrance for hero lines
    tl.from(".hero-line-1", {
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    })
      .from(".hero-line-2", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out"
      }, "-=0.6")
      .from(".hero-p", {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: "power3.out"
      }, "-=0.6")
      .from(".hero-btn", {
        scale: 0.8,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.7)"
      }, "-=0.6")
      .from(".word-stack", {
        opacity: 0,
        duration: 0.5
      }, "-=0.4");

    // Continuous pulse for the gradient
    gsap.to(".word-span", {
      "--pulse": "50%",
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, { scope: heroRef });

  // Handle word cycling animation (Seamless Stack Slide)
  useGSAP(() => {
    if (wordIndex === 0 && gsap.getProperty(".word-stack", "y") !== 0) {
      // If we are resetting to 0, it means we just finished the duplicate animation.
      // We snap back to 0 instantly without animation.
      gsap.set(".word-stack", { y: 0 });
      return;
    }

    gsap.to(".word-stack", {
      y: `-${wordIndex * 100}%`,
      duration: 0.8,
      ease: "power4.inOut",
      onComplete: () => {
        // If we just reached the duplicated first word at the end
        if (wordIndex === words.length - 1) {
          setWordIndex(0);
        }
      }
    });
  }, { scope: heroRef, dependencies: [wordIndex] });

  useEffect(() => {
    const interval = setInterval(() => {
      // Only increment if we aren't at the very end (the duplicate)
      // The onComplete handles the snap back
      setWordIndex((prev) => {
        if (prev === words.length - 1) return prev;
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { user, token } = useAuth();

  // ─── CMS Data ──────────────────────────────────────────────────────────────
  const [homepage, setHomepage] = useState<Homepage | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [featuredPastEvents, setFeaturedPastEvents] = useState<FeaturedEvent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  // Testimonial submission form state
  const [tForm, setTForm] = useState({ author_role: '', quote: '' });
  const [tSubmitting, setTSubmitting] = useState(false);
  const [tSuccess, setTSuccess] = useState(false);
  const [tError, setTError] = useState('');
  const [tModalOpen, setTModalOpen] = useState(false);

  // Identity section ref for scroll-masking
  // (Now handled inside IdentitySection component)

  // Mobile detection for horizontal scroll
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Brute-force kill all ScrollTriggers on page unmount (fixes Next.js route cache issues)
  useEffect(() => {
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Testimonial carousel
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const tLoopRef = useRef<VLoop | null>(null);
  const tItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sponsor marquee
  const sTrackRef = useRef<HTMLDivElement | null>(null);


  // ─── Unified Events Hover State ─────────────────────────────────────────────
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/cms/homepage`).then((r) => r.json()),
      fetch(`${API_URL}/api/events?status=upcoming&limit=4`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/featured-events`).then((r) => r.json()),
      fetch(`${API_URL}/api/forum/threads?limit=4&sort=latest`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/team`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/sponsors`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/testimonials`).then((r) => r.json()),
    ])
      .then(([homepageRes, eventsRes, featuredPastRes, threadsRes, teamRes, sponsorsRes, testimonialsRes]) => {
        if (homepageRes.data) setHomepage(homepageRes.data);
        if (eventsRes.data) {
          const allEvents = eventsRes.data;
          setFeaturedEvent(allEvents[0] ?? null);
          setEvents(allEvents.slice(1, 4));
        }
        if (featuredPastRes.data) setFeaturedPastEvents(featuredPastRes.data)
        if (threadsRes.data) setThreads(threadsRes.data);
        if (teamRes.data) setTeamMembers(teamRes.data.slice(0, 6));
        if (sponsorsRes.data) setSponsors(sponsorsRes.data);
        if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Testimonial GSAP loop init ─────────────────────────────────────────────
  useEffect(() => {
    if (testimonials.length < 2) return;
    const items = tItemRefs.current.filter((el): el is HTMLButtonElement => !!el);
    if (items.length < 2) return;
    const n = items.length;

    const updateOpacities = (active: number, instant = false) => {
      items.forEach((item, j) => {
        const dist = Math.min(Math.abs(j - active), n - Math.abs(j - active));
        const op = dist === 0 ? 1 : dist === 1 ? 0.45 : dist === 2 ? 0.18 : 0.05;
        if (instant) gsap.set(item, { opacity: op });
        else gsap.to(item, { opacity: op, duration: 0.35, ease: 'power1.out', overwrite: 'auto' });
      });
    };

    const loop = buildVerticalLoop(items, {
      paused: true,
      center: true,
      onChange: (_el, i) => {
        setActiveTestimonial(i);
        updateOpacities(i);
      },
    });
    // Set initial opacities without animation
    updateOpacities(0, true);
    tLoopRef.current = loop;
    return () => { loop.cleanup(); tLoopRef.current = null; };
  }, [testimonials.length]);

  // ─── Testimonial auto-rotate ────────────────────────────────────────────────
  useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = setInterval(() => {
      tLoopRef.current?.next({ duration: 0.5, ease: 'power1.inOut' });
    }, 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  // ─── Sponsor horizontal marquee ─────────────────────────────────────────────
  useEffect(() => {
    if (!sTrackRef.current || sponsors.length < 1) return;
    const track = sTrackRef.current;
    // 8 copies in DOM. Measure the real track width and translate by exactly
    // one copy's pixel width so the loop point is visually identical to start.
    const oneCopyPx = track.scrollWidth / 8;
    const tween = gsap.fromTo(track,
      { x: 0 },
      { x: -oneCopyPx, ease: 'none', duration: 12, repeat: -1 },
    );
    return () => { tween.kill(); };
  }, [sponsors.length]);

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
    <div className="min-h-screen bg-[#F4F4F0]">

      {/* ── Brutalist Grid Hero (with Advanced Ink Trail) ── */}
      <section
        ref={heroRef}
        className="relative bg-[#F4F4F0] min-h-screen py-16 flex flex-col items-center justify-center overflow-hidden hero-section"
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
        {/* <InkMaskOverlay /> */}
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
            className={`text-[3rem] sm:text-[4rem] md:text-[5.5rem] font-black uppercase tracking-tighter text-foreground leading-[1.0] py-8 select-none w-full grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-4 mb-[-1.5rem] sm:mb-[-2rem] md:mb-[-3rem] ${antonio.className}`}
          >
            {/* Line 1: COME | TO | LEARN. */}
            <span className="text-right hero-line-1">
              COME
            </span>
            <span className="text-center hero-line-1">
              TO
            </span>
            <span className="text-left hero-line-1">
              LEARN.
            </span>

            {/* Line 2: STAY | TO | [ANIMATED] */}
            <span className="text-right hero-line-2">
              STAY
            </span>
            <span className="text-center hero-line-2">
              TO
            </span>
            <span className="text-left flex items-center h-full w-full hero-line-2">
              <span className="flex items-center relative h-[1.1em] w-full overflow-hidden">
                <div className="absolute inset-0 flex flex-col word-stack">
                  {words.map((word, idx) => (
                    <span
                      key={`${word}-${idx}`}
                      style={{
                        backgroundImage: [
                          "linear-gradient(90deg, #ff7c70 0%, #EA4335 var(--pulse), #c53026 100%)", // Red
                          "linear-gradient(90deg, #7aaaff 0%, #4285F4 var(--pulse), #3474d4 100%)", // Blue
                          "linear-gradient(90deg, #ffe066 0%, #FBBC05 var(--pulse), #e6ad00 100%)", // Yellow
                          "linear-gradient(90deg, #69e88d 0%, #34A853 var(--pulse), #288a44 100%)"  // Green
                        ][idx % 4],
                        WebkitBackgroundClip: "text",
                        backgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "transparent",
                      }}
                      className="h-full w-full flex items-center justify-start whitespace-nowrap leading-none pt-[0.0em] word-span flex-shrink-0"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </span>
            </span>
          </h1>

          <p
            className="mt-6 text-base sm:text-lg font-normal max-w-xl mx-auto text-gray-700 tracking-wide relative z-10 text-center px-4 py-1 hero-p"
          >
            Real projects. Real people. Real fun.
          </p>

          <div
            className="mt-6 relative z-10 flex justify-center hero-btn"
          >
            <Magnetic>
              <Link
                href="/events"
                className="inline-flex items-center gap-4 px-2 py-2 pr-2 pl-6 sm:pl-8 bg-[#F4F4F0] border-[3px] border-foreground rounded-full shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] hover:-translate-y-1 hover:-translate-x-1 active:shadow-none active:translate-y-1 active:translate-x-1 transition-[background-color,color,box-shadow,transform] duration-300 group"
              >
                <span className="font-black uppercase tracking-widest text-base sm:text-lg text-foreground">
                  EXPLORE EVENTS
                </span>
                <span className="bg-[#FBBC05] border-2 border-foreground px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full text-foreground group-hover:bg-[#4285F4] group-hover:text-white transition-colors">
                  FREE TO JOIN
                </span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ── Who We Are: Horizontal Scroll Reveal ── */}
      <WhoWeAre />

      {/* ── Upcoming Events ── */}
      {!loading && (
        <UpcomingEvents
          events={events}
          featuredEvent={featuredEvent}
        />
      )}

      {/* ── Featured Past Events Showcase ── */}
      {!loading && (
        <PastEventsShowcase events={featuredPastEvents} />
      )}

      {/* ── Technologies We Cover ── */}
      {/* <TechnologiesGrid /> */}

      {/* ── Latest Forum Discussions ── */}
      {!loading && (
        <section className="py-20 bg-[#F4F4F0]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <div className="h-1.5 w-16 mx-auto flex mb-6 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-slate-900 leading-[0.9] ${antonio.className}`}>
                Latest Discussions
              </h2>
              <p className="mt-5 text-base md:text-lg text-gray-500 max-w-xl mx-auto">
                Join the conversation in our community forum.
              </p>
            </div>

            {threads.length > 0 ? (
              <ThreadFocusStack threads={threads} />
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <div className="w-16 h-16 bg-[#FBBC05] border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-5 shadow-[4px_4px_0_#0f172a] rotate-3">
                    <svg className="w-8 h-8 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className={`text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-3 ${antonio.className}`}>
                    No Discussions Yet
                  </h3>
                  <p className="text-slate-600 font-bold text-sm leading-relaxed max-w-xs px-2">
                    Be the first to start a conversation! Head over to our forum and post a thread.
                  </p>
                  <div className="mt-5 flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-bounce" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '100ms' }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <Link href="/forum" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-bold hover:bg-blue-600 transition-all shadow-md">
                    Go to Forum →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Testimonials + Meet the Team share one continuous dark background ── */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
        <ParallaxBackdrop src="/images/Android_Mascots_Classroom.png" className="opacity-[0.08] z-0" />

      {/* ── Testimonials ── */}
      <section className="py-24 relative z-[1]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="h-1 w-12 flex mb-4 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <h2 className={`text-4xl sm:text-5xl font-black uppercase tracking-tighter text-white leading-none ${antonio.className}`}>
                What Our Members Say
              </h2>
            </div>
            {user && !tSuccess && (
              <button
                onClick={() => setTModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/25 text-sm font-bold uppercase tracking-wide text-white rounded-xl hover:bg-white/20 transition-all flex-shrink-0 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Drop Your Thoughts
              </button>
            )}
            {tSuccess && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-xl text-green-300 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Submitted for review!
              </div>
            )}
          </div>

          {testimonials.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-14 items-start">

              {/* Left: GSAP infinite vertical loop — no clones, no snaps */}
              <div
                className="h-[320px] overflow-hidden relative px-1"
                style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)' }}
              >

                {testimonials.map((t, i) => {
                  const isActive = i === activeTestimonial;
                  return (
                    <button
                      key={t.testimonial_id}
                      ref={el => { tItemRefs.current[i] = el; }}
                      onClick={() => tLoopRef.current?.toIndex(i, { duration: 0.5, ease: 'power1.inOut' })}
                      className="flex items-center gap-3 w-full text-left"
                      style={{ height: '64px', willChange: 'transform' }}
                    >
                      <div className={`relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden ${
                        isActive ? 'ring-2 ring-[#4285F4] ring-offset-2 ring-offset-slate-900' : ''
                      }`}>
                        {(t as any).avatar_url ? (
                          <img src={(t as any).avatar_url} alt={t.author_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-blue-400 to-indigo-500">
                            {getInitials(t.author_name)}
                          </div>
                        )}
                        {isActive && (
                          <span className="absolute inset-0 rounded-full border-2 border-[#4285F4]/40 animate-ping" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-tight truncate text-white">
                          {t.author_name}
                        </p>
                        {t.author_role && (
                          <p className="text-[11px] text-white/50 mt-0.5 truncate">{t.author_role}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right: fixed-height glass card */}
              <div className="relative h-80 sm:h-72">
                {testimonials.map((t, i) => (
                  <div
                    key={t.testimonial_id}
                    className={`absolute inset-0 transition-all duration-500 ${
                      i === activeTestimonial
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-3 pointer-events-none'
                    }`}
                  >
                    <div className="h-full bg-white/10 border border-white/20 rounded-2xl p-6 flex flex-col overflow-hidden backdrop-blur-sm">
                      <div className="text-4xl font-black text-blue-400 leading-none select-none mb-3 -mt-1">"</div>
                      <p className="text-white/90 leading-relaxed italic text-sm sm:text-base flex-1 overflow-hidden"
                         style={{ wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {t.quote}
                      </p>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/15 flex-shrink-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {getInitials(t.author_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate leading-none">{t.author_name}</p>
                          {t.author_role && <p className="text-[11px] text-white/60 truncate mt-0.5">{t.author_role}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-blue-200 text-sm bg-white/5 border border-white/10 rounded-2xl">
              No testimonials yet — be the first to share your experience!
            </div>
          )}

        </div>
      </section>

      {/* Testimonial submission modal */}
      {tModalOpen && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => { setTModalOpen(false); setTError(''); }}
        >
          <div
            className="bg-white border-[2.5px] border-black shadow-[8px_8px_0_#000] rounded-2xl p-7 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className={`text-2xl font-black uppercase tracking-tighter text-gray-900 leading-none ${antonio.className}`}>Drop Your Thoughts</h3>
                <p className="text-xs text-gray-400 mt-1">Reviewed before publishing</p>
              </div>
              <button onClick={() => { setTModalOpen(false); setTError(''); }} className="text-gray-400 hover:text-gray-900 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(user.full_name)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">{user.full_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Submitting as yourself</p>
              </div>
            </div>

            {tError && <p className="text-red-500 text-xs mb-3">{tError}</p>}

            <input
              type="text"
              placeholder="Your title or role — e.g. Flutter Dev, CS Student (optional)"
              value={tForm.author_role}
              onChange={e => setTForm({ ...tForm, author_role: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-all mb-3"
            />
            <textarea
              placeholder="Tell us about your experience with GDGOC-UITU... *"
              value={tForm.quote}
              onChange={e => setTForm({ ...tForm, quote: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black transition-all resize-none mb-5"
            />

            <div className="flex gap-3">
              <button
                disabled={tSubmitting}
                onClick={async () => {
                  setTError('');
                  if (!tForm.quote.trim()) { setTError('Please write your experience.'); return; }
                  setTSubmitting(true);
                  try {
                    const res = await fetch(`${API_URL}/api/cms/testimonials`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ author_name: user.full_name, author_role: tForm.author_role, quote: tForm.quote }),
                    });
                    const json = await res.json();
                    if (!res.ok) { setTError(json.error || 'Failed to submit.'); return; }
                    setTSuccess(true);
                    setTModalOpen(false);
                    setTForm({ author_role: '', quote: '' });
                  } catch {
                    setTError('Something went wrong.');
                  } finally {
                    setTSubmitting(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#4285F4] border-[2px] border-black shadow-[3px_3px_0_#000] text-white text-sm font-black uppercase tracking-wide hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0_#000] active:shadow-none transition-all disabled:opacity-50"
              >
                {tSubmitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => { setTModalOpen(false); setTError(''); }}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-black transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Meet the Team ── */}
      {!loading && (
        <section className="py-24 relative z-[1] overflow-hidden">

          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-16 px-4">
              <div className="h-1.5 w-16 mx-auto flex mb-6 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <h2 className={`text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] ${antonio.className}`}>
                Meet the Team
              </h2>
              <p className="mt-4 text-base text-blue-200 font-medium max-w-md mx-auto">
                The builders behind GDGOC-UITU
              </p>
            </div>

            {teamMembers.length > 0 ? (
              <>
                {/* Card stage — full-bleed so ghost cards can peek in from edges */}
                <div className="relative overflow-x-clip py-2">

                  <div className="flex items-end justify-center gap-3 sm:gap-5 px-6">

                    {/* Ghost far-left (barely visible teaser) */}
                    {teamMembers[4] && (
                      <div
                        className="flex-shrink-0 w-36 sm:w-44 hidden lg:block pointer-events-none"
                        style={{ opacity: 0.22, filter: 'blur(1px)', transform: 'scale(0.88)', transformOrigin: 'bottom center' }}
                      >
                        <MiniMemberCard member={teamMembers[4]} theme={TEAM_THEMES[3]} />
                      </div>
                    )}

                    {/* Left team lead */}
                    {teamMembers[1] && (
                      <div className="flex-shrink-0 w-44 sm:w-52 hidden sm:block">
                        <MiniMemberCard member={teamMembers[1]} theme={TEAM_THEMES[1]} />
                      </div>
                    )}

                    {/* CENTER — GDG Lead (largest, sits highest via items-end) */}
                    <div className="flex-shrink-0 w-56 sm:w-64 md:w-72 relative z-[5]">
                      <MiniMemberCard member={teamMembers[0]} theme={TEAM_THEMES[0]} isLead />
                    </div>

                    {/* Right team lead */}
                    {teamMembers[2] && (
                      <div className="flex-shrink-0 w-44 sm:w-52 hidden sm:block">
                        <MiniMemberCard member={teamMembers[2]} theme={TEAM_THEMES[2]} />
                      </div>
                    )}

                    {/* Ghost far-right (barely visible teaser) */}
                    {teamMembers[3] && (
                      <div
                        className="flex-shrink-0 w-36 sm:w-44 hidden lg:block pointer-events-none"
                        style={{ opacity: 0.22, filter: 'blur(1px)', transform: 'scale(0.88)', transformOrigin: 'bottom center' }}
                      >
                        <MiniMemberCard member={teamMembers[3]} theme={TEAM_THEMES[3]} />
                      </div>
                    )}

                  </div>
                </div>

                {/* CTA */}
                <div className="mt-14 flex justify-center px-4">
                  <Link
                    href="/about"
                    className={`inline-flex items-center gap-3 px-8 py-3.5 bg-white/5 border-2 border-white/20 text-white text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(255,255,255,0.12)] hover:bg-white/10 hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all group ${antonio.className}`}
                  >
                    Meet the Full Team
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-16 h-16 bg-[#4285F4] border-[3px] border-black rounded-2xl flex items-center justify-center mb-5 shadow-[4px_4px_0_#000] rotate-3">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className={`text-3xl font-black text-white uppercase tracking-tight leading-none mb-3 ${antonio.className}`}>
                  Team Coming Soon
                </h3>
                <p className="text-blue-200 font-bold text-sm leading-relaxed max-w-xs px-2">
                  Our leadership team is being assembled. Check back soon to meet the crew!
                </p>
                <div className="mt-5 flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#4285F4] animate-bounce" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '100ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      </div>{/* end shared dark background wrapper */}

      {/* ── Sponsors Strip ── */}
      {!loading && (
        <section className="py-14 bg-[#F4F4F0] border-t border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center mb-10">
            Supported By
          </p>
          {sponsors.length > 0 ? (
            <div className="py-3" style={{ overflowX: 'clip' }}>
              <div
                ref={sTrackRef}
                className="flex items-center gap-6 flex-nowrap"
                style={{ width: 'max-content', willChange: 'transform' }}
              >
                {Array.from({ length: 8 }, (_, ci) => sponsors.map((sponsor, si) => (
                  <a
                    key={`${sponsor.sponsor_id}-${ci}-${si}`}
                    href={sponsor.website_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex-shrink-0 w-52 h-40 flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg hover:-translate-y-2 transition-[border-color,box-shadow,transform]"
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="max-h-16 max-w-full object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-[filter,opacity] duration-300"
                      />
                    ) : (
                      <div className="w-full h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-400">{sponsor.name[0]}</span>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-500 mt-3 text-center truncate w-full">{sponsor.name}</p>
                  </a>
                ))).flat()}
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 bg-[#FBBC05] border-[3px] border-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-[4px_4px_0_#0f172a] rotate-3">
                  <svg className="w-7 h-7 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <h3 className={`text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-2 ${antonio.className}`}>
                  No Sponsors Yet
                </h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-xs">
                  Interested in supporting GDGOC-UITU?{' '}
                  <Link href="/contact" className="text-[#4285F4] hover:underline">Get in touch!</Link>
                </p>
                <div className="mt-4 flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#EA4335] animate-bounce" style={{ animationDelay: '100ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#FBBC05] animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#34A853] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Newsletter + Join CTA ── */}
      <section className="py-20 bg-[#F4F4F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Join CTA */}
            <div
              className="group bg-white rounded-[2rem] ring-1 ring-black/5 p-8 flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300"
              style={{ boxShadow: '4px 4px 0 #4285F4, 0 16px 40px -10px rgba(66,133,244,0.35)' }}
            >
              <div>
                <div className="h-2 w-16 flex mb-6 rounded-full overflow-hidden">
                  <div className="flex-1 bg-[#4285F4]" />
                  <div className="flex-1 bg-[#EA4335]" />
                  <div className="flex-1 bg-[#FBBC05]" />
                  <div className="flex-1 bg-[#34A853]" />
                </div>
                <h2 className={`text-4xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9] ${antonio.className}`}>
                  Ready to<br />Join?
                </h2>
                <p className="mt-4 text-sm text-gray-500 font-medium leading-relaxed">
                  Become part of a growing community of student developers at UIT University.
                  Register for free and start your journey today.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  href="/register"
                  className="px-6 py-3 rounded-full bg-[#4285F4] text-white font-black text-xs uppercase tracking-widest hover:-translate-y-0.5 transition-all text-center shadow-md hover:shadow-blue-200"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/about"
                  className="px-6 py-3 rounded-full border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-widest hover:border-gray-400 hover:text-slate-900 transition-all text-center"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Newsletter */}
            <div
              className="group bg-[#4285F4] rounded-[2rem] ring-1 ring-white/10 p-8 flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300"
              style={{ boxShadow: '4px 4px 0 #3474d4, 0 16px 40px -10px rgba(66,133,244,0.35)' }}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-4">
                  Newsletter
                </p>
                <h2 className={`text-4xl font-black text-white uppercase tracking-tighter leading-[0.9] ${antonio.className}`}>
                  Stay in<br />the Loop
                </h2>
                <p className="mt-4 text-sm text-blue-100 font-medium leading-relaxed">
                  Get notified about upcoming events, workshops, and community updates. No spam, ever.
                </p>
              </div>

              {newsletterSuccess ? (
                <div className="mt-6 p-4 rounded-xl bg-white/15 border border-white/20 text-center">
                  <p className="text-white font-black text-sm uppercase tracking-wide">You&apos;re subscribed!</p>
                  <p className="text-blue-200 text-xs mt-1">We&apos;ll keep you in the loop.</p>
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="mt-6 space-y-3">
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={newsletterName}
                    onChange={(e) => setNewsletterName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white placeholder-blue-200 text-sm outline-none focus:bg-white/20 transition-all"
                  />
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white placeholder-blue-200 text-sm outline-none focus:bg-white/20 transition-all"
                  />
                  {newsletterError && (
                    <p className="text-red-300 text-xs">{newsletterError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={newsletterLoading}
                    className="w-full py-2.5 rounded-xl bg-white text-[#4285F4] font-bold text-sm hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
              <Link href="/" className="flex items-center mb-3 hover:opacity-80 transition-opacity">
                <img
                  src="/images/logolight.png"
                  alt="GDGOC-UITU Logo"
                  className="h-10 w-auto object-contain"
                />
              </Link>
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

      {/* ── Announcement Mascot (fixed; placed last so ScrollTrigger pin-spacers never conflict) ── */}
      <MascotBanner announcement={homepage?.announcement ?? null} />

    </div >
  );
}