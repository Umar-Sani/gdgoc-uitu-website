'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Antonio } from 'next/font/google';

const antonio = Antonio({ subsets: ['latin'] });

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

// ─── Thread Card ──────────────────────────────────────────────────────────────

function ThreadCard({ thread }: { thread: Thread }) {
  return (
    <Link href={`/forum/${thread.thread_id}`} className="block hover:bg-blue-50/50 transition-colors">
      <div className="flex items-center p-4 gap-4">
        
        {/* Topic & Category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {thread.is_pinned && (
              <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
              </svg>
            )}
            {thread.is_locked && (
              <svg className="w-3.5 h-3.5 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            )}
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {thread.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: `#${thread.category_color}` }}
            >
              {thread.category_name}
            </span>
            {thread.tags && thread.tags.length > 0 && (
               <div className="flex gap-1">
                 {thread.tags.slice(0, 3).map(tag => (
                   <span key={tag} className="text-gray-500">#{tag}</span>
                 ))}
               </div>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="hidden sm:flex items-center gap-1 w-32 shrink-0">
          <div className="flex -space-x-1">
            {/* Thread author first */}
            <div className="relative z-10 w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden shrink-0" title={thread.author_name}>
              {thread.author_avatar ? (
                <img src={thread.author_avatar} alt={thread.author_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold text-gray-600">{getInitials(thread.author_name)}</span>
              )}
            </div>
            {/* Then repliers */}
            {thread.participants?.map((p, i) => (
              <div key={i} className={`relative w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 z-0`} title={p.name}>
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-gray-600">{getInitials(p.name)}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Replies */}
        <div className="hidden md:flex flex-col items-center justify-center w-16 shrink-0 text-gray-500">
          <span className="text-sm font-semibold text-gray-700">{thread.reply_count}</span>
          <span className="text-[10px] uppercase">Replies</span>
        </div>

        {/* Views */}
        <div className="hidden lg:flex flex-col items-center justify-center w-16 shrink-0 text-gray-500">
          <span className="text-sm font-semibold text-gray-700">{thread.view_count}</span>
          <span className="text-[10px] uppercase">Views</span>
        </div>

        {/* Activity */}
        <div className="hidden sm:flex flex-col items-end justify-center w-24 shrink-0 text-gray-500 text-xs">
          <span className="font-medium text-gray-900">{timeAgo(thread.last_reply_at || thread.created_at)}</span>
        </div>

      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonThread() {
  return (
    <div className="p-4 animate-pulse flex items-center gap-4">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="hidden sm:flex space-x-1 w-32 shrink-0">
        <div className="w-6 h-6 rounded-full bg-gray-200" />
        <div className="w-6 h-6 rounded-full bg-gray-200" />
      </div>
      <div className="hidden md:block w-16 h-4 bg-gray-200 rounded shrink-0" />
      <div className="hidden lg:block w-16 h-4 bg-gray-200 rounded shrink-0" />
      <div className="hidden sm:block w-24 h-4 bg-gray-200 rounded shrink-0" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { user } = useAuth();

  const [threads, setThreads]       = useState<Thread[]>([]);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col items-center justify-center relative">
        <div className="absolute top-0 left-0 w-full h-1.5 flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <h1 className={`text-5xl sm:text-7xl md:text-8xl font-black text-white uppercase tracking-tighter ${antonio.className}`}>
            Forum
          </h1>
          <p className="mt-8 text-blue-50 font-medium text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto border-2 border-white/20 bg-white/5 px-6 py-4 shadow-[4px_4px_0_rgba(255,255,255,0.1)]">
            Ask questions, share knowledge, connect with the community
          </p>
          <div className="mt-10">
            <a
              href="#forum-directory"
              className="px-6 py-3 bg-white/5 border-2 border-white/20 text-white text-xs sm:text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_rgba(255,255,255,0.1)] hover:bg-white/10 hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0_rgba(255,255,255,0.1)] transition-all"
            >
              Join Discussion
            </a>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div id="forum-directory" className="w-full max-w-full mx-auto px-4 sm:px-8 lg:px-12 py-16">

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

        {/* ── Thread list (full width) ── */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Table Header */}
            <div className="hidden sm:flex items-center px-4 py-3 gap-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="flex-1">Topic</div>
              <div className="w-32 shrink-0">Participants</div>
              <div className="hidden md:block w-16 shrink-0 text-center">Replies</div>
              <div className="hidden lg:block w-16 shrink-0 text-center">Views</div>
              <div className="w-24 shrink-0 text-right">Activity</div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonThread key={i} />)
              ) : threads.length === 0 ? (
                <div className="text-center py-20 bg-white">
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
                threads.map((thread) => (
                  <ThreadCard key={thread.thread_id} thread={thread} />
                ))
              )}
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}