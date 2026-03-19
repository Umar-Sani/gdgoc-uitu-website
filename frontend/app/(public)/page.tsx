'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  { name: 'Flutter',       color: '#54C5F8', icon: '📱' },
  { name: 'AI / ML',       color: '#FF7043', icon: '🤖' },
  { name: 'Web Dev',       color: '#42A5F5', icon: '🌐' },
  { name: 'Cloud',         color: '#26A69A', icon: '☁️' },
  { name: 'Android',       color: '#66BB6A', icon: '🤖' },
  { name: 'Open Source',   color: '#AB47BC', icon: '🔓' },
  { name: 'Cybersecurity', color: '#EF5350', icon: '🔒' },
  { name: 'DevOps',        color: '#78909C', icon: '⚙️' },
];

// ─── Platform Colors ──────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { color: string; label: string }> = {
  instagram: { color: '#E1306C', label: 'Instagram' },
  twitter:   { color: '#1DA1F2', label: 'Twitter' },
  linkedin:  { color: '#0A66C2', label: 'LinkedIn' },
  facebook:  { color: '#1877F2', label: 'Facebook' },
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
  const [homepage, setHomepage]   = useState<Homepage | null>(null);
  const [events, setEvents]       = useState<Event[]>([]);
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null);
  const [threads, setThreads]     = useState<Thread[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sponsors, setSponsors]   = useState<Sponsor[]>([]);
  const [loading, setLoading]     = useState(true);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterName, setNewsletterName]   = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError]     = useState('');

  // Testimonial carousel
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch all data ─────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/cms/homepage`).then((r) => r.json()),
      fetch(`${API_URL}/api/events?status=upcoming&limit=4`).then((r) => r.json()),
      fetch(`${API_URL}/api/forum/threads?limit=3&sort=latest`).then((r) => r.json()),
      fetch(`${API_URL}/api/social/posts?limit=3&status=published`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/team`).then((r) => r.json()),
      fetch(`${API_URL}/api/cms/sponsors`).then((r) => r.json()),
    ])
      .then(([homepageRes, eventsRes, threadsRes, socialRes, teamRes, sponsorsRes]) => {
        if (homepageRes.data) setHomepage(homepageRes.data);
        if (eventsRes.data) {
          const allEvents = eventsRes.data;
          setFeaturedEvent(allEvents[0] ?? null);
          setEvents(allEvents.slice(1, 4));
        }
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
      {homepage?.announcement && (
        <div className="bg-[#4285F4] text-white text-center text-xs font-medium py-2 px-4">
          📢 {homepage.announcement}
        </div>
      )}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-blue-400 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-400 blur-3xl" />
        </div>

        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white bg-opacity-10 border border-white border-opacity-20 mb-8">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-white text-xs font-semibold tracking-wide">
              Google Developer Groups on Campus
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
            {loading ? (
              <span className="animate-pulse bg-white bg-opacity-20 rounded-xl inline-block w-96 h-14" />
            ) : (
              homepage?.hero_title ?? 'Welcome to GDGOC-UITU'
            )}
          </h1>

          <p className="mt-6 text-lg text-blue-200 max-w-2xl mx-auto leading-relaxed">
            {loading ? (
              <span className="animate-pulse bg-white bg-opacity-10 rounded-xl inline-block w-full h-6" />
            ) : (
              homepage?.hero_subtitle ?? 'Building the next generation of developers at UIT University Karachi.'
            )}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={homepage?.hero_cta_url ?? '/events'}
              className="px-8 py-3.5 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-all shadow-lg"
            >
              {homepage?.hero_cta_text ?? 'Explore Events'}
            </Link>
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl border border-white border-opacity-30 text-white font-semibold text-sm hover:bg-white hover:bg-opacity-10 transition-all"
            >
              Join the Community
            </Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && homepage && (
          <div className="relative border-t border-white border-opacity-10">
            <div className="max-w-3xl mx-auto px-4 py-10 grid grid-cols-3 gap-8">
              <StatCounter value={homepage.stats_members} label="Community Members" />
              <StatCounter value={homepage.stats_events} label="Events Hosted" />
              <StatCounter value={homepage.stats_projects} label="Projects Built" />
            </div>
          </div>
        )}
      </section>

      {/* ── Quick Access Cards ── */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Browse Events', desc: 'Workshops, hackathons & more', href: '/events', emoji: '🎯', color: 'hover:border-blue-300 hover:bg-blue-50' },
              { label: 'Join Forum', desc: 'Ask questions & discuss', href: '/forum', emoji: '💬', color: 'hover:border-green-300 hover:bg-green-50' },
              { label: 'Meet the Team', desc: 'The people behind GDGOC', href: '/about', emoji: '👥', color: 'hover:border-yellow-300 hover:bg-yellow-50' },
              { label: 'Contact Us', desc: 'Get in touch with us', href: '/contact', emoji: '✉️', color: 'hover:border-purple-300 hover:bg-purple-50' },
            ].map((card) => (
              <Link key={card.href} href={card.href}>
                <div className={`group p-5 rounded-2xl border border-gray-100 transition-all duration-200 cursor-pointer h-full ${card.color}`}>
                  <div className="text-2xl mb-3">{card.emoji}</div>
                  <p className="font-bold text-gray-900 text-sm">{card.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                </div>
              </Link>
            ))}
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
                className={`transition-all duration-500 ${
                  i === activeTestimonial ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 translate-y-4'
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
                className={`rounded-full transition-all ${
                  i === activeTestimonial ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white bg-opacity-30'
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

      {/* ── Newsletter ── */}
      <section className="py-20 bg-gradient-to-br from-[#4285F4] to-indigo-600">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">Stay in the Loop</h2>
          <p className="mt-3 text-blue-100 text-sm leading-relaxed">
            Get notified about upcoming events, workshops, and community updates.
          </p>

          {newsletterSuccess ? (
            <div className="mt-8 p-5 rounded-2xl bg-white bg-opacity-10 border border-white border-opacity-20">
              <p className="text-white font-semibold">🎉 You're subscribed!</p>
              <p className="text-blue-200 text-sm mt-1">We'll keep you updated on everything GDGOC.</p>
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="mt-8 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={newsletterName}
                  onChange={(e) => setNewsletterName(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white bg-opacity-15 border border-white border-opacity-20 text-white placeholder-blue-200 text-sm outline-none focus:bg-opacity-20 transition-all"
                />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 rounded-xl bg-white bg-opacity-15 border border-white border-opacity-20 text-white placeholder-blue-200 text-sm outline-none focus:bg-opacity-20 transition-all"
                />
              </div>
              {newsletterError && (
                <p className="text-red-300 text-xs">{newsletterError}</p>
              )}
              <button
                type="submit"
                disabled={newsletterLoading}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white text-[#4285F4] font-bold text-sm hover:bg-gray-100 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {newsletterLoading ? 'Subscribing...' : 'Subscribe for Free'}
              </button>
              <p className="text-blue-200 text-xs">No spam. Unsubscribe anytime.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── What We Do ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-1 w-12 flex mb-3 rounded-full overflow-hidden mx-auto">
              <div className="flex-1 bg-[#4285F4]" />
              <div className="flex-1 bg-[#EA4335]" />
              <div className="flex-1 bg-[#FBBC05]" />
              <div className="flex-1 bg-[#34A853]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">What We Do</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
              We bring together students passionate about technology, innovation, and building things that matter.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🎯', title: 'Workshops', desc: 'Hands-on sessions covering Flutter, AI/ML, Web Dev, Cloud and more.' },
              { icon: '🏆', title: 'Hackathons', desc: '24-hour buildathons where teams compete to solve real problems.' },
              { icon: '💬', title: 'Community', desc: 'A forum to ask questions, share knowledge and connect with peers.' },
              { icon: '🚀', title: 'Mentorship', desc: 'Learn from senior developers and industry professionals.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all text-center">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Join CTA ── */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Ready to Join?</h2>
          <p className="mt-4 text-gray-500 text-sm leading-relaxed max-w-xl mx-auto">
            Become part of a growing community of student developers at UIT University. Register for free and start your journey.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="px-8 py-3.5 rounded-xl bg-[#4285F4] text-white font-bold text-sm hover:bg-blue-600 transition-all shadow-lg">
              Create Free Account
            </Link>
            <Link href="/about" className="px-8 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:border-blue-300 hover:text-blue-600 transition-all">
              Learn More
            </Link>
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
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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