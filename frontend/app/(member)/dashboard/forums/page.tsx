'use client';

import Link from 'next/link';
import { MessageSquare, ThumbsUp, Eye, Plus, Pin } from 'lucide-react';
import { useMemberData, type MemberThread } from '@/context/MemberDataContext';
import { timeAgo } from '@/lib/formatters';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// Strip markdown noise so the preview reads as clean plain text (light — no
// markdown renderer needed for a list view).
function plainPreview(text: string | null): string {
  if (!text) return '';
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links → label
    .replace(/[#>*_`~]/g, '')                  // md symbols
    .replace(/\s+/g, ' ')
    .trim();
}

function ThreadRow({ thread }: { thread: MemberThread }) {
  const preview = plainPreview(thread.body_preview);

  return (
    <Link
      href={`/forum/${thread.thread_id}`}
      className="block bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-200 hover:shadow-md transition-all p-5"
    >
      {/* Author + meta */}
      <div className="flex items-center gap-2.5 text-xs text-gray-500 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0">
          {thread.author_avatar ? (
            <img src={thread.author_avatar} alt={thread.author_name ?? ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-white">{getInitials(thread.author_name ?? 'U')}</span>
          )}
        </div>
        <span className="font-semibold text-gray-700 truncate">{thread.author_name ?? 'Unknown'}</span>
        <span className="text-gray-300">•</span>
        <span>{timeAgo(thread.created_at)}</span>
        {thread.is_pinned && (
          <span className="inline-flex items-center gap-1 text-[#34A853] font-semibold">
            <Pin className="w-3 h-3" />
            Pinned
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900 leading-snug">{thread.title}</h3>

      {/* Category + tags */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {thread.category_name && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: `#${thread.category_color}` }}
          >
            {thread.category_name}
          </span>
        )}
        {thread.tags?.slice(0, 4).map((tag) => (
          <span key={tag} className="text-xs text-gray-500">#{tag}</span>
        ))}
      </div>

      {/* Plain-text preview */}
      {preview && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2">{preview}</p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-5 mt-4 text-xs font-medium text-gray-500">
        <span className="flex items-center gap-1.5"><ThumbsUp className="w-4 h-4" />{thread.upvote_count}</span>
        <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" />{thread.reply_count}</span>
        <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" />{thread.view_count}</span>
      </div>
    </Link>
  );
}

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
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  );
}

export default function MemberForumsPage() {
  const { threads, threadsLoading } = useMemberData();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Latest Discussions</h1>
          <p className="text-sm text-gray-500 mt-1">Ask questions, share knowledge, connect with the community</p>
        </div>
        <Link
          href="/forum/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4285F4] hover:bg-blue-600 text-white text-sm font-semibold transition-all shadow-md hover:shadow-blue-200 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Thread
        </Link>
      </div>

      {threadsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonThread key={i} />)}
        </div>
      ) : threads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-20">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">No threads yet</h3>
          <p className="text-sm text-gray-400 mt-1">Be the first to start a discussion</p>
          <Link
            href="/forum/new"
            className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#4285F4] text-white text-sm font-semibold hover:bg-blue-600 transition-all"
          >
            Start a Thread
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <ThreadRow key={thread.thread_id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}
