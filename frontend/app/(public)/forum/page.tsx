'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

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
    <Link href={`/forum/${thread.thread_id}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 p-5 cursor-pointer">
        <div className="flex items-start gap-4">

          {/* Author avatar */}
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            {thread.author_avatar ? (
              <img src={thread.author_avatar} alt={thread.author_name} className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(thread.author_name || 'U')
            )}
          </div>

          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex items-start gap-2 flex-wrap">
              {thread.is_pinned && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                  📌 Pinned
                </span>
              )}
              {thread.is_locked && (
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                  🔒 Locked
                </span>
              )}
              <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                {thread.title}
              </h3>
            </div>

            {/* Body preview */}
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {thread.body_preview}
            </p>

            {/* Tags */}
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {thread.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-100">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">

              {/* Category */}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: `#${thread.category_color}` }}
              >
                {thread.category_name}
              </span>

              {/* Author */}
              <span className="truncate">{thread.author_name}</span>

              {/* Time */}
              <span>{timeAgo(thread.last_reply_at || thread.created_at)}</span>

              {/* Stats */}
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {thread.reply_count}
              </span>

              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                {thread.upvote_count}
              </span>

            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonThread() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
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

  const totalPages = Math.ceil(total / LIMIT);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          <div className="h-1 w-16 flex mb-6 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forum</h1>
              <p className="text-sm text-gray-500 mt-1">
                Ask questions, share knowledge, connect with the community
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search button */}
              <Link
                href="/forum/search"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all bg-white"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </Link>

              {/* New thread button — only for logged in users */}
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

          {/* ── Sort tabs ── */}
          <div className="mt-6 flex gap-1 border-b border-gray-200">
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
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Thread list ── */}
          <div className="flex-1 space-y-3">

            {/* Total count */}
            {!loading && (
              <p className="text-sm text-gray-400 mb-4">
                {total} thread{total !== 1 ? 's' : ''}
                {selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''}
              </p>
            )}

            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonThread key={i} />)
            ) : threads.length === 0 ? (
              <div className="text-center py-20">
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

          {/* ── Sidebar — Categories ── */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Categories
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category_id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}