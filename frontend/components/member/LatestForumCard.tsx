'use client';

import Link from 'next/link';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { timeAgo } from '@/lib/formatters';
import { useMemberData } from '@/context/MemberDataContext';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function LatestForumCard() {
  const { threads: allThreads, threadsLoading: loading } = useMemberData();
  const threads = allThreads.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">Latest Discussions</h2>
        <Link href="/dashboard/forums" className="text-xs text-blue-500 hover:underline">
          See all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">No discussions yet</p>
          <Link href="/forum/new" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
            Start one →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(t => (
            <Link
              key={t.thread_id}
              href={`/forum/${t.thread_id}`}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all border border-gray-50 hover:border-gray-200"
            >
              {/* Author avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                {t.author_avatar ? (
                  <img src={t.author_avatar} alt={t.author_name ?? ''} className="w-9 h-9 object-cover" />
                ) : (
                  getInitials(t.author_name ?? 'U')
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {t.category_name && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: `#${t.category_color}` }}
                    >
                      {t.category_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <ThumbsUp className="w-3 h-3" />
                    {t.upvote_count}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <MessageSquare className="w-3 h-3" />
                    {t.reply_count}
                  </span>
                  <span className="text-[11px] text-gray-400">· {timeAgo(t.created_at)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
