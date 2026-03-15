'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-600 border-pink-100',
  twitter:   'bg-sky-50 text-sky-600 border-sky-100',
  linkedin:  'bg-blue-50 text-blue-600 border-blue-100',
  facebook:  'bg-indigo-50 text-indigo-600 border-indigo-100',
};

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-50 text-gray-500 border-gray-100',
  scheduled: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  posted:    'bg-green-50 text-green-600 border-green-100',
  failed:    'bg-red-50 text-red-500 border-red-100',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function SocialDashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;
    fetchPosts();
  }, [user, token, filter]);

  function fetchPosts() {
    setPostsLoading(true);
    const params = filter !== 'all' ? `?status=${filter}` : '';
    fetch(`${API_URL}/api/social/posts${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => setPosts(res.data ?? []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`${API_URL}/api/social/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPosts();
    } catch {
      setError('Failed to delete post.');
    }
  }

  if (loading || !user) return null;

  const stats = {
    total: posts.length,
    draft: posts.filter(p => p.status === 'draft').length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    posted: posts.filter(p => p.status === 'posted').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage posts across platforms</p>
          </div>
          <Link
            href="/admin/social/new"
            className="ml-auto px-4 py-2 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            + New Post
          </Link>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'Draft', value: stats.draft, color: 'text-gray-500' },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-yellow-600' },
            { label: 'Posted', value: stats.posted, color: 'text-green-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'draft', 'scheduled', 'posted'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-[#4285F4] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {postsLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">No posts found</p>
            <Link href="/admin/social/new" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
              Create your first post →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <div key={post.post_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${PLATFORM_COLORS[post.platform] ?? 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                        {post.platform}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[post.status] ?? ''}`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{post.caption}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {post.scheduled_at && (
                        <span className="text-xs text-gray-400">📅 {formatDate(post.scheduled_at)}</span>
                      )}
                      {post.hashtags?.length > 0 && (
                        <span className="text-xs text-blue-400">{post.hashtags.slice(0, 3).map((h: string) => `#${h}`).join(' ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/social/${post.post_id}/edit`}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(post.post_id)}
                      className="px-3 py-1.5 rounded-lg border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}