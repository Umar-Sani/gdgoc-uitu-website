'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

type Thread = {
  thread_id: string;
  title: string;
  body_preview: string;
  category_name: string;
  category_color: string;
  tags: string[];
  reply_count: number;
  upvote_count: number;
  created_at: string;
  author_name: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ForumSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery]     = useState(initialQuery);
  const [input, setInput]     = useState(initialQuery);
  const [results, setResults] = useState<Thread[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    fetch(`${API_URL}/api/forum/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setResults(res.data);
          setTotal(res.total);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setQuery(input.trim());
    router.replace(`/forum/search?q=${encodeURIComponent(input.trim())}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="h-1 w-16 flex mb-4 rounded-full overflow-hidden">
            <div className="flex-1 bg-[#4285F4]" />
            <div className="flex-1 bg-[#EA4335]" />
            <div className="flex-1 bg-[#FBBC05]" />
            <div className="flex-1 bg-[#34A853]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Search Forum</h1>
          <p className="text-sm text-gray-500 mt-1">Search across all threads and discussions</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search threads..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md"
          >
            Search
          </button>
        </form>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700">No results found</h3>
            <p className="text-sm text-gray-400 mt-1">
              No threads matched "{query}"
            </p>
            <Link
              href="/forum"
              className="mt-4 inline-block px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
            >
              Browse All Threads
            </Link>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 mb-4">
              {total} result{total !== 1 ? 's' : ''} for "{query}"
            </p>
            {results.map((thread) => (
              <Link key={thread.thread_id} href={`/forum/${thread.thread_id}`}>
                <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-5 cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: `#${thread.category_color}` }}
                    >
                      {thread.category_name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{timeAgo(thread.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors mb-1">
                    {thread.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {thread.body_preview}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <span>{thread.author_name}</span>
                    <span>{thread.reply_count} replies</span>
                    <span>{thread.upvote_count} upvotes</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {/* Back to forum */}
        <div className="mt-8 text-center">
          <Link href="/forum" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">
            ← Back to Forum
          </Link>
        </div>

      </div>
    </div>
  );
}