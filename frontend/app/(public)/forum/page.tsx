'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/context/AuthContext';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'] });

// ─── Markdown rendering (matches the thread detail page) ──────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  upvote_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  last_reply_at: string | null;
  participants: Participant[];
};

type Category = {
  category_id: number;
  name: string;
  color_hex: string;
};

type SortType = 'latest' | 'popular' | 'unanswered';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Stat (icon + value) ───────────────────────────────────────────────────────

function Stat({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      {value}
    </span>
  );
}

// ─── Reddit-style Thread Card ────────────────────────────────────────────────────

function ThreadCard({
  thread,
  isAdmin,
  onPin,
  onLock,
  onDelete,
}: {
  thread: Thread;
  isAdmin: boolean;
  onPin: (t: Thread) => void;
  onLock: (t: Thread) => void;
  onDelete: (t: Thread) => void;
}) {
  // Detect whether the body preview overflows its clamp → show "… Read more"
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight + 4);
  }, [thread.body_preview]);

  // The backend truncates the preview to 150 chars (often mid-word). Trim the
  // partial word and add an ellipsis. "More" = backend-cut OR visually clipped.
  const backendCut = (thread.body_preview?.length ?? 0) >= 150;
  const previewText = backendCut
    ? thread.body_preview.replace(/\s+\S*$/, '').trimEnd() + '…'
    : thread.body_preview;
  const hasMore = backendCut || isClamped;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all p-5">

      {/* ── Top row: author (left) + admin actions (right) ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0">
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

        {/* Admin moderation actions */}
        {isAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onPin(thread)}
              title={thread.is_pinned ? 'Unpin' : 'Pin'}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${thread.is_pinned ? 'text-[#34A853]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
            </button>
            <button
              onClick={() => onLock(thread)}
              title={thread.is_locked ? 'Unlock' : 'Lock'}
              className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${thread.is_locked ? 'text-[#FBBC05]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            </button>
            <button
              onClick={() => onDelete(thread)}
              title="Delete"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Heading ── */}
      <Link href={`/forum/${thread.thread_id}`} className="block group mt-3">
        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#4285F4] transition-colors leading-snug">
          {thread.title}
        </h3>
      </Link>

      {/* ── Category + tags (below heading) ── */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: `#${thread.category_color}` }}
        >
          {thread.category_name}
        </span>
        {thread.tags?.slice(0, 4).map((tag) => (
          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
        ))}
      </div>

      {/* ── Body preview (rendered as markdown, like the thread page) ── */}
      <div className="relative mt-3">
        <div
          ref={bodyRef}
          className="max-h-28 overflow-hidden text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-a:text-blue-600 prose-code:text-pink-600 prose-img:rounded-lg prose-img:max-h-24 prose-img:my-1 [&_pre]:whitespace-pre-wrap [&_pre]:text-xs"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {preprocessMarkdown(previewText)}
          </ReactMarkdown>
        </div>
        {/* Slide fade-out when there's more to read */}
        {hasMore && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        )}
      </div>

      {/* "Read more" link when the body is cut off */}
      {hasMore && (
        <Link
          href={`/forum/${thread.thread_id}`}
          className="inline-block mt-1.5 text-xs font-semibold text-[#4285F4] hover:underline"
        >
          Read more →
        </Link>
      )}

      {/* ── Bottom stats: likes, replies, views, participants ── */}
      <div className="flex items-center gap-5 mt-4 text-xs font-medium text-gray-500">
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

        {/* Participants */}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonThread() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200" />
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2.5" />
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-3 bg-gray-200 rounded w-full mb-1.5" />
      <div className="h-3 bg-gray-200 rounded w-5/6 mb-4" />
      <div className="flex gap-5">
        <div className="h-4 w-10 bg-gray-200 rounded" />
        <div className="h-4 w-10 bg-gray-200 rounded" />
        <div className="h-4 w-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

// ─── Pinned Posts Sidebar ─────────────────────────────────────────────────────

function PinnedSidebar({ pinned }: { pinned: Thread[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-[#34A853]" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
        <span className="text-sm font-bold text-gray-700">Pinned Posts</span>
      </div>
      {pinned.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400 text-center">No pinned posts</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {pinned.map((t) => (
            <Link key={t.thread_id} href={`/forum/${t.thread_id}`} className="block px-4 py-3 hover:bg-blue-50/50 transition-colors">
              <h4 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{t.title}</h4>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-400">
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: `#${t.category_color}` }}
                >
                  {t.category_name}
                </span>
                <span>{t.reply_count} replies</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Community Rules (collapsible, Reddit-style) ──────────────────────────────

const FORUM_RULES: { title: string; body: string }[] = [
  {
    title: 'Be excellent to each other',
    body: "Treat fellow members like your favourite rubber duck — with patience and respect. No flaming, harassment, or gatekeeping. We were all beginners once. 🤝",
  },
  {
    title: 'Keep it on-topic',
    body: 'Tech, projects, events, and learning are the main course. A side of memes is fine, but please don\'t turn the whole forum into a meme dump.',
  },
  {
    title: 'Search before you post',
    body: 'Chances are someone already asked. A 10-second search saves everyone time and keeps things tidy. Duplicate threads may get merged or closed.',
  },
  {
    title: 'Write clear titles & tag your post',
    body: '"help pls it broke 😭" helps nobody. Describe the actual issue, pick the right category, and add tags — you\'ll get answers way faster.',
  },
  {
    title: 'No spam or shameless self-promo',
    body: 'Sharing a cool project you built? We\'d love to see it. Dropping "buy my course" links every other post? Hard pass.',
  },
  {
    title: 'Keep it legal & clean',
    body: 'No piracy, cracked software, leaked keys, or NSFW content. Basically — keep it to something you\'d happily show your professor.',
  },
  {
    title: 'Pay it forward',
    body: 'Figured something out? Drop the answer for the next person. Today\'s helper is tomorrow\'s person stuck at 3am. Good karma compounds. ✨',
  },
];

function CommunityRules() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <svg className="w-4 h-4 text-[#4285F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-sm font-bold text-gray-700">Forum Rules</span>
      </div>
      <div className="divide-y divide-gray-100">
        {FORUM_RULES.map((rule, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-bold text-gray-400 w-4 shrink-0 mt-px tabular-nums">{i + 1}</span>
                <span className="flex-1 text-sm font-semibold text-gray-700 leading-snug">{rule.title}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <p className="px-4 pb-3 pl-11 text-xs text-gray-500 leading-relaxed">
                  {rule.body}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { user, token } = useAuth();
  const isAdmin = user?.role_name === 'admin' || user?.role_name === 'super_admin';

  const [threads, setThreads]       = useState<Thread[]>([]);
  const [pinnedThreads, setPinnedThreads] = useState<Thread[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sort, setSort]                         = useState<SortType>('latest');
  const [searchInput, setSearchInput]           = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const LIMIT = 20;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch categories ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/forum/categories`)
      .then((r) => r.json())
      .then((res) => { if (res.data) setCategories(res.data); })
      .catch(console.error);
  }, []);

  // ─── Fetch threads ──────────────────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        sort,
      });
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const res = await fetch(`${API_URL}/api/forum/threads?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setThreads(json.data);
        setTotal(json.total);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sort, page]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  useEffect(() => { setPage(1); }, [selectedCategory, sort]);

  // ─── Fetch pinned threads (for sidebar) ───────────────────────────────────────
  const fetchPinned = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/forum/threads?limit=50`);
      const json = await res.json();
      if (json.data) setPinnedThreads(json.data.filter((t: Thread) => t.is_pinned));
    } catch (err) {
      console.error('Failed to fetch pinned threads:', err);
    }
  }, []);

  useEffect(() => { fetchPinned(); }, [fetchPinned]);

  // ─── Admin moderation actions ────────────────────────────────────────────────
  const moderate = useCallback(async (url: string, method: string, body?: object) => {
    try {
      await fetch(`${API_URL}${url}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      fetchThreads();
      fetchPinned();
    } catch (err) {
      console.error('Moderation action failed:', err);
    }
  }, [token, fetchThreads, fetchPinned]);

  const handlePin = (t: Thread) => moderate(`/api/forum/threads/${t.thread_id}/pin`, 'PUT', { is_pinned: !t.is_pinned });
  const handleLock = (t: Thread) => moderate(`/api/forum/threads/${t.thread_id}/lock`, 'PUT', { is_locked: !t.is_locked });
  const handleDelete = (t: Thread) => {
    if (window.confirm(`Delete "${t.title}"? This can't be undone from here.`)) {
      moderate(`/api/forum/threads/${t.thread_id}`, 'DELETE');
    }
  };

  // ─── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative pt-28 md:pt-32 pb-12 md:pb-16">
        <div className="absolute top-0 left-0 w-full h-1.5 flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black text-white uppercase tracking-tighter ${antonio.className}`}>
            Forum
          </h1>
          <p className="mt-4 text-blue-200 font-medium text-sm sm:text-base leading-relaxed max-w-md">
            Ask questions, share knowledge, connect with the community
          </p>
          <div className="mt-8">
            <a
              href="#forum-directory"
              className="inline-block px-6 py-3 bg-white/5 border-2 border-white/20 text-white text-xs sm:text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(255,255,255,0.1)] hover:bg-white/10 hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0_rgba(255,255,255,0.1)] transition-all"
            >
              Join Discussion
            </a>
          </div>
        </div>

        {/* Decorative image — absolutely pinned to bottom-right, feet touch the section edge */}
        <div className="hidden md:block absolute bottom-0 right-8 lg:right-16 w-60 lg:w-80 pointer-events-none">
          <img
            src="/images/forum%20woah%202.3%20%281%29.png"
            alt=""
            className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(66,133,244,0.25)]"
            draggable={false}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div id="forum-directory" className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Discussions</h2>
            {!loading && (
              <p className="text-sm text-gray-500 mt-1">
                {total} thread{total !== 1 ? 's' : ''}
                {selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/forum/search"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all bg-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </Link>

            {user && (
              <Link
                href="/forum/new"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md hover:shadow-blue-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Thread
              </Link>
            )}
          </div>
        </div>

        {/* ── Two-column: main list (left) + pinned sidebar (right) ── */}
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main column ── */}
          <div className="flex-1 min-w-0">

        {/* ── Category Dropdown + Sort Tabs ── */}
        <div className="mb-8 flex items-center gap-4 border-b border-gray-200">

          {/* Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors -mb-px border-b-2 border-transparent"
            >
              {selectedCategory === 'all' ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  All Categories
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `#${categories.find(c => c.name === selectedCategory)?.color_hex || '4285F4'}` }}
                  />
                  {selectedCategory}
                </span>
              )}
              <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Panel */}
            {categoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2.5 ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category_id}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-2.5 ${
                      selectedCategory === cat.name
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `#${cat.color_hex}` }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200" />

          {/* Sort Tabs */}
          {(['latest', 'popular', 'unanswered'] as SortType[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${
                sort === s
                  ? 'border-[#4285F4] text-[#4285F4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'unanswered' ? 'Unanswered' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Thread cards ── */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonThread key={i} />)}
          </div>
        ) : threads.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-20">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No threads yet</h3>
            <p className="text-sm text-gray-400 mt-1">Be the first to start a discussion</p>
            {user && (
              <Link
                href="/forum/new"
                className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
              >
                Start a Thread
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.thread_id}
                thread={thread}
                isAdmin={isAdmin}
                onPin={handlePin}
                onLock={handleLock}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all ${
                  page === p
                    ? 'bg-[#4285F4] text-white'
                    : 'border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}

          </div>{/* ── end main column ── */}

          {/* ── Right sidebar: pinned posts + rule book ── */}
          <aside className="lg:w-80 shrink-0 order-first lg:order-last space-y-6">
            <PinnedSidebar pinned={pinnedThreads} />
            <CommunityRules />
          </aside>

        </div>{/* ── end two-column ── */}
      </div>
    </div>
  );
}