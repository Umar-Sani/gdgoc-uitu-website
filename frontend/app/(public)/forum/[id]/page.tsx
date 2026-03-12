'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  author_id: string;
  author_name: string;
  author_avatar: string | null;
};

type Reply = {
  reply_id: string;
  thread_id: string;
  parent_reply_id: string | null;
  body: string;
  upvote_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_username: string | null;
};

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
  return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function Avatar({ name, avatar, size = 'md' }: { name: string; avatar: string | null; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {avatar
        ? <img src={avatar} alt={name} className="w-full h-full rounded-full object-cover" />
        : getInitials(name || 'U')
      }
    </div>
  );
}

// ─── Reply Card ───────────────────────────────────────────────────────────────

function ReplyCard({ reply }: { reply: Reply }) {
  return (
    <div className={`flex gap-3 ${reply.parent_reply_id ? 'ml-10 pl-4 border-l-2 border-gray-100' : ''}`}>
      <Avatar name={reply.author_name} avatar={reply.author_avatar} size="sm" />
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900">{reply.author_name}</span>
          {reply.author_username && (
            <span className="text-xs text-gray-400">@{reply.author_username}</span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{timeAgo(reply.created_at)}</span>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{reply.body}</p>
        <div className="flex items-center gap-1 mt-3">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-xs text-gray-400">{reply.upvote_count}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const replyBoxRef = useRef<HTMLTextAreaElement>(null);

  const [thread, setThread]   = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [replyBody, setReplyBody]       = useState('');
  const [replyError, setReplyError]     = useState('');
  const [isReplying, setIsReplying]     = useState(false);
  const [upvoted, setUpvoted]           = useState(false);
  const [upvoteCount, setUpvoteCount]   = useState(0);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // ─── Fetch thread ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;

    fetch(`${API_URL}/api/forum/threads/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.data) { setNotFound(true); return; }
        setThread(res.data.thread);
        setReplies(res.data.replies);
        setUpvoteCount(res.data.thread.upvote_count);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  // ─── Upvote ─────────────────────────────────────────────────────────────────
  async function handleUpvote() {
    if (!user) { router.push('/login'); return; }

    try {
      const res = await fetch(`${API_URL}/api/forum/threads/${params.id}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.data) {
        setUpvoted(json.data.upvoted);
        setUpvoteCount((prev) => json.data.upvoted ? prev + 1 : prev - 1);
      }
    } catch (err) {
      console.error('Upvote error:', err);
    }
  }

  // ─── Submit reply ────────────────────────────────────────────────────────────
  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) { setReplyError('Reply cannot be empty.'); return; }
    if (replyBody.trim().length < 5) { setReplyError('Reply must be at least 5 characters.'); return; }

    setIsReplying(true);
    setReplyError('');

    try {
      const res = await fetch(`${API_URL}/api/forum/threads/${params.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setReplyError(json.error || 'Failed to post reply.');
        return;
      }

      // Add new reply to list optimistically
      setReplies((prev) => [...prev, {
        ...json.data,
        author_name: user?.full_name || 'You',
        author_avatar: null,
        author_username: null,
      }]);
      setReplyBody('');

      // Update reply count on thread
      setThread((prev) => prev ? { ...prev, reply_count: prev.reply_count + 1 } : prev);

    } catch {
      setReplyError('Something went wrong. Please try again.');
    } finally {
      setIsReplying(false);
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  // ─── Not found ────────────────────────────────────────────────────────────────
  if (notFound || !thread) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Thread Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">This thread may have been deleted.</p>
          <Link href="/forum" className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all">
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Forum
        </button>

        {/* ── Thread ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">

          {/* Category + badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: `#${thread.category_color}` }}
            >
              {thread.category_name}
            </span>
            {thread.is_pinned && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                📌 Pinned
              </span>
            )}
            {thread.is_locked && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                🔒 Locked
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 leading-snug mb-4">
            {thread.title}
          </h1>

          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={thread.author_name} avatar={thread.author_avatar} />
            <div>
              <p className="text-sm font-semibold text-gray-900">{thread.author_name}</p>
              <p className="text-xs text-gray-400">{timeAgo(thread.created_at)}</p>
            </div>
          </div>

          {/* Body */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {thread.body_preview}
          </p>

          {/* Tags */}
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {thread.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-600 border border-blue-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats + upvote */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                upvoted
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {upvoteCount}
            </button>

            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {thread.reply_count} replies
            </span>

            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {thread.view_count} views
            </span>
          </div>
        </div>

        {/* ── Replies ── */}
        {replies.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
            </h2>
            {replies.map((reply) => (
              <ReplyCard key={reply.reply_id} reply={reply} />
            ))}
          </div>
        )}

        {/* ── Reply box ── */}
        {thread.is_locked ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center text-sm text-gray-500">
            🔒 This thread is locked. No new replies allowed.
          </div>
        ) : !user ? (
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 text-center">
            <p className="text-sm text-blue-700 font-medium">
              <Link href="/login" className="underline">Log in</Link> to join the discussion
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Add a Reply</h3>
            <form onSubmit={handleReply} noValidate>
              <textarea
                ref={replyBoxRef}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write your reply..."
                rows={4}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all resize-none ${
                  replyError
                    ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200'
                    : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              {replyError && <p className="mt-1 text-xs text-red-500">{replyError}</p>}
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-400">{replyBody.length} characters</p>
                <button
                  type="submit"
                  disabled={isReplying}
                  className="px-5 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md hover:shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isReplying ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Posting...
                    </span>
                  ) : 'Post Reply'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}