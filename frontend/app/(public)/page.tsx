'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import Magnetic from '../../components/ui/magnetic';

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const words = ["BUILD", "SHIP", "CONNECT", "COMPETE", "LEVEL UP", "INNOVATE", "HACK", "CREATE", "LEAD"];

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Hide announcement banner the moment user scrolls
  useEffect(() => {
    const handleScroll = () => setAtTop(window.scrollY < 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [homepage, setHomepage] = useState<Homepage | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [featuredPastEvents, setFeaturedPastEvents] = useState<FeaturedEvent[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Testimonial carousel
  const [activeTestimonial, setActiveTestimonial] = useState(0);

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

      {/* ── Announcement Banner ── */}
      {/* Outer keeps its bg always; inner content fades on scroll */}
      <div>
        {homepage?.announcement && (
          <div className="bg-[#4285F4] bg-gradient-to-r from-[#4285F4] to-indigo-600 p-4 text-center">
            <div className={`flex flex-wrap justify-center items-center gap-3 transition-opacity duration-300 ease-in-out ${atTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-white text-sm font-medium">
                📢 {homepage.announcement}
              </p>
              <Link
                href="/events"
                className="py-1.5 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border-2 border-white border-opacity-60 text-white hover:border-opacity-100 hover:bg-white hover:bg-opacity-10 transition-all"
              >
                Learn more
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>


      {/* ── Brutalist Grid Hero ── */}
      <section className="relative bg-[#F4F4F0] min-h-[90vh] pt-16 pb-16 flex flex-col items-center justify-center overflow-hidden border-b-4 border-foreground">

        {/* Background Grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #00000015 1px, transparent 1px), linear-gradient(to bottom, #00000015 1px, transparent 1px)',
            backgroundSize: '100px 100px',
            backgroundPosition: 'center'
          }}
        />

        {/* Floating Abstract Elements */}
        {/* Star Top Left */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute top-20 left-[12%] w-16 h-16 hidden md:block"
        >
          <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="6"><path d="M100 0L125 75L200 100L125 125L100 200L75 125L0 100L75 75Z" fill="transparent" /></svg>
        </motion.div>

        {/* Orange Splat Top Right */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-[18%] w-16 h-16 text-[#FF5A25] drop-shadow-[4px_4px_0_rgba(0,0,0,0.1)] hidden md:block"
        >
          <svg viewBox="0 0 200 200" fill="currentColor"><path d="M108.5 2C130.5 -4 153.5 6 166.5 24C179.5 42 182.5 67 194.5 89C206.5 111 227.5 130 219.5 151C211.5 172 174.5 185 151.5 197C128.5 209 119.5 220 98.5 220C77.5 220 64.5 209 43.5 195C22.5 181 3.5 164 0.5 142C-2.5 120 7.5 93 14.5 70C21.5 47 25.5 28 41.5 14C57.5 0 86.5 8 108.5 2Z" /></svg>
        </motion.div>

        {/* Green shape Middle Left */}
        <motion.div
          initial={{ x: -10 }} animate={{ x: 10 }} transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute bottom-32 left-[20%] hidden md:block w-12 h-10 drop-shadow-[2px_2px_0_#000]"
        >
          <div className="flex">
            <div className="w-6 h-12 bg-[#00A651] rounded-l-full"></div>
            <div className="w-6 h-12 bg-[#00A651] rounded-l-full -ml-[0.1rem]"></div>
            <div className="w-6 h-12 bg-[#00A651] rounded-l-full -ml-[0.1rem]"></div>
          </div>
        </motion.div>

        {/* Red Globe Bottom Left */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-16 left-[28%] w-10 h-10 rounded-full border-2 border-foreground bg-[#FF4C4C] shadow-brutal hidden md:block"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full text-foreground opacity-60"><path d="M50 0 A 50 50 0 1 0 100 50" fill="none" stroke="currentColor" strokeWidth="3" /><line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="3" /><line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="3" /><ellipse cx="50" cy="50" rx="20" ry="50" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
        </motion.div>

        {/* Disha Card (Bottom Left) */}
        <motion.div
          initial={{ rotate: -5, y: 50, opacity: 0 }}
          animate={{ rotate: -5, y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-10 left-[10%] hidden lg:block"
        >
          <div className="w-20 bg-[#FFED00] border-2 border-foreground rounded-xl shadow-brutal overflow-hidden">
            <div className="h-20 bg-[#FFED00] flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center"><svg width="40" height="40" viewBox="0 0 200 200"><path fill="#FF4C4C" d="M100 0L125 75L200 100L125 125L100 200L75 125L0 100L75 75Z" /></svg></div>
              <div className="relative z-10 w-16 h-16 rounded-full overflow-hidden border-2 border-foreground bg-white">
                <img src="https://i.pravatar.cc/150?img=47" className="w-full h-full object-cover" alt="Student" />
              </div>
            </div>
            <div className="bg-[#00A651] py-1 text-center border-t-2 border-foreground text-white font-black tracking-widest text-xs">DISHA</div>
          </div>
        </motion.div>

        {/* Elya Card (Bottom Right) */}
        <motion.div
          initial={{ rotate: 10, y: 50, opacity: 0 }}
          animate={{ rotate: 10, y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="absolute bottom-12 right-[10%] hidden lg:block"
        >
          <div className="w-24 bg-[#FF4C4C] border-2 border-foreground rounded-t-full rounded-b-xl shadow-brutal overflow-hidden pt-3 px-2 pb-2">
            <div className="h-24 bg-[#FF4C4C] rounded-t-full flex items-center justify-center relative">
              <div className="absolute text-yellow-300 top-2 text-xl">✦</div>
              <div className="relative z-10 w-20 h-22 overflow-hidden rounded-b-xl">
                <img src="https://i.pravatar.cc/150?img=11" className="w-full h-full object-cover grayscale" alt="Student" />
              </div>
            </div>
            <div className="text-center text-white font-black tracking-widest text-xs mt-2 mb-1">ELYA</div>
          </div>
        </motion.div>


        <div className="relative z-10 max-w-[900px] mx-auto px-4 text-center flex flex-col items-center mt-6">

          <h1 className="text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] font-black uppercase tracking-tighter text-foreground leading-[0.9] flex flex-col items-center select-none w-full">
            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
              COME TO LEARN.
            </motion.span>

            <motion.span initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap justify-center items-center gap-x-2 sm:gap-x-3 mt-3 sm:mt-4 max-w-full">
              <span>STAY TO</span>
              <span className="text-[#be5cff] drop-shadow-[2px_2px_0_#000] inline-flex items-center relative h-[1.2em] min-w-[180px] sm:min-w-[260px] md:min-w-[320px] overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
                    className="absolute left-0 bottom-[0.05em] text-left whitespace-nowrap"
                  >
                    {words[wordIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="mt-6 text-base sm:text-lg font-normal max-w-xl mx-auto text-gray-500 tracking-wide relative z-10 text-center bg-[#F4F4F0] bg-opacity-80 px-4 py-1"
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
                <span className="bg-[#FFED00] border-2 border-foreground px-4 py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full text-foreground group-hover:bg-[#FF4C4C] group-hover:text-white transition-colors">
                  FREE TO JOIN
                </span>
              </Link>
            </Magnetic>
          </motion.div>

        </div>
      </section>

      {/* ── About Us Snapshot ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — Text */}
            <div>
              <div className="h-1 w-12 flex mb-4 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Who We Are
              </p>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                A community of{' '}
                <span className="text-[#4285F4]">student builders</span>{' '}
                at UIT University.
              </h2>
              <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                GDGOC-UITU is a Google Developer Group on Campus at UIT University Karachi.
                We bring together students passionate about technology through hands-on workshops,
                hackathons, and a thriving peer community — all backed by Google.
              </p>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                Whether you're just getting started or already building real projects,
                there's a place for you here.
              </p>

              {/* Stat pills */}
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                {[
                  { value: '200+', label: 'Members' },
                  { value: 'Since 2022', label: 'Est.' },
                  { value: '10+', label: 'Events/Year' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-center"
                  >
                    <p className="text-sm font-bold text-[#4285F4]">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/about"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                Learn More About Us
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Right — Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '🎯', title: 'Workshops', desc: 'Hands-on technical sessions on Flutter, AI/ML, Web Dev and more.' },
                { icon: '🏆', title: 'Hackathons', desc: '24-hour build competitions with real prizes and industry judges.' },
                { icon: '💬', title: 'Community', desc: 'A forum for questions, discussions, and peer-to-peer learning.' },
                { icon: '🚀', title: 'Mentorship', desc: 'Guidance from senior developers and industry professionals.' },
              ].map((item) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-white hover:shadow-md transition-all"
                >
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Featured Event ── */}
      {!loading && featuredEvent && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Featured Event</h2>
              <p className="text-sm text-gray-500 mt-1">Don't miss our next big event</p>
            </div>

            <Link href={`/events/${featuredEvent.event_id}`}>
              <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2">

                  {/* Banner */}
                  <div className="relative h-56 lg:h-full min-h-56 bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden">
                    {featuredEvent.banner_url && (
                      <img
                        src={featuredEvent.banner_url}
                        alt={featuredEvent.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-40" />
                    <div className="absolute top-4 left-4 flex gap-2">
                      {featuredEvent.is_free ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">FREE</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-gray-800">PKR {featuredEvent.ticket_price?.toLocaleString()}</span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black bg-opacity-40 text-white capitalize">
                        {featuredEvent.event_type}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex flex-col justify-between">
                    <div>
                      {featuredEvent.category_name && (
                        <span className="text-xs font-bold text-[#4285F4] uppercase tracking-wide">
                          {featuredEvent.category_name}
                        </span>
                      )}
                      <h3 className="text-2xl font-bold text-gray-900 mt-2 leading-tight group-hover:text-blue-600 transition-colors">
                        {featuredEvent.title}
                      </h3>
                      {featuredEvent.description && (
                        <p className="text-sm text-gray-500 mt-3 leading-relaxed line-clamp-3">
                          {featuredEvent.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(featuredEvent.start_datetime)} · {formatTime(featuredEvent.start_datetime)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {featuredEvent.venue ?? 'Online'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {featuredEvent.seats_available} seats available
                      </div>

                      <div className="pt-2">
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold group-hover:bg-blue-600 transition-all shadow-md">
                          {featuredEvent.is_free ? 'Register for Free' : `Get Ticket · PKR ${featuredEvent.ticket_price?.toLocaleString()}`}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── Upcoming Events Grid ── */}
      {!loading && events.length > 0 && (
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">More Upcoming Events</h2>
              </div>
              <Link href="/events" className="text-sm font-semibold text-[#4285F4] hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.event_id} href={`/events/${event.event_id}`}>
                  <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all overflow-hidden h-full flex flex-col">
                    <div className="relative h-36 bg-gradient-to-br from-blue-500 to-indigo-600">
                      {event.banner_url && (
                        <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}
                      <div className="absolute top-3 left-3">
                        {event.is_free
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">FREE</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-gray-800">PKR {event.ticket_price?.toLocaleString()}</span>
                        }
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      {event.category_name && (
                        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">{event.category_name}</span>
                      )}
                      <h3 className="font-bold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
                        {event.title}
                      </h3>
                      <div className="flex-1" />
                      <div className="text-xs text-gray-500 space-y-1 mt-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(event.start_datetime)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {event.venue ?? 'Online'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
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
                      <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-[#4285F4] transition-colors mb-2">
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
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Technologies We Cover</h2>
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
      </section>

      {/* ── Latest Forum Discussions ── */}
      {!loading && threads.length > 0 && (
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Latest Discussions</h2>
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
      )}

      {/* ── Testimonials ── */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="h-1 w-12 flex mb-6 rounded-full overflow-hidden mx-auto">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-12">What Our Members Say</h2>

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
      {!loading && socialPosts.length > 0 && (
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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">From Our Socials</h2>
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
      )}

      {/* ── Team Preview ── */}
      {!loading && teamMembers.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden">
                  <div className="flex-1 bg-[#4285F4]" />
                  <div className="flex-1 bg-[#EA4335]" />
                  <div className="flex-1 bg-[#FBBC05]" />
                  <div className="flex-1 bg-[#34A853]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Meet the Team</h2>
                <p className="text-sm text-gray-500 mt-1">The people behind GDGOC-UITU</p>
              </div>
              <Link href="/about" className="text-sm font-semibold text-[#4285F4] hover:underline">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {teamMembers
                .sort((a, b) => a.display_order - b.display_order)
                .map((member) => (
                  <div key={member.member_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5 text-center">
                    <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {member.avatar_url
                        ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" />
                        : getInitials(member.full_name)
                      }
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{member.full_name}</p>
                    <p className="text-xs text-[#4285F4] mt-0.5">{member.role_title}</p>
                    {member.bio && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{member.bio}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Sponsors Strip ── */}
      {!loading && sponsors.length > 0 && (
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
      )}

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
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
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
                <h2 className="text-2xl font-bold text-white tracking-tight">
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
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-white font-bold text-sm">GDGOC-UITU</span>
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

    </div>
  );
}