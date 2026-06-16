'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ThumbsUp, Calendar, MapPin, CheckCircle2, ArrowLeft } from 'lucide-react';
import { formatDate, timeAgo } from '@/lib/formatters';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SKILL_COLORS: Record<string, string> = {
  'Flutter':         'bg-blue-50 text-blue-600 border-blue-100',
  'AI/ML':           'bg-purple-50 text-purple-600 border-purple-100',
  'Web Development': 'bg-green-50 text-green-600 border-green-100',
  'Cloud':           'bg-sky-50 text-sky-600 border-sky-100',
  'Android':         'bg-lime-50 text-lime-600 border-lime-100',
  'Open Source':     'bg-orange-50 text-orange-600 border-orange-100',
  'Cybersecurity':   'bg-red-50 text-red-600 border-red-100',
  'DevOps':          'bg-yellow-50 text-yellow-600 border-yellow-100',
  'UI/UX':           'bg-pink-50 text-pink-600 border-pink-100',
  'General':         'bg-gray-50 text-gray-600 border-gray-100',
};

type RecentThread = {
  thread_id: string;
  title: string;
  upvote_count: number;
  reply_count: number;
  created_at: string;
  category_name: string | null;
  category_color: string | null;
};

type UpcomingEvent = {
  event_id: string;
  title: string;
  start_datetime: string;
  venue: string | null;
  is_online: boolean;
  category_name: string | null;
  category_color: string | null;
};

type PublicProfile = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  skill_tags: string[] | null;
  is_verified: boolean;
  created_at: string;
  role_name: string;
  thread_count: number;
  reply_count: number;
  recent_threads: RecentThread[];
  upcoming_events: UpcomingEvent[];
};

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`${API_URL}/api/users/${encodeURIComponent(username)}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(res => {
        if (!res.data) { setNotFound(true); return; }
        setProfile(res.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-4 border-blue-400 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-3xl font-black text-white mb-2">User not found</h1>
        <p className="text-white/60 mb-6">We couldn&apos;t find a member with that username.</p>
        <Link href="/forum" className="px-5 py-2.5 rounded-xl bg-white text-[#4285F4] text-sm font-semibold hover:bg-white/90 transition-all">
          Back to Forum
        </Link>
      </div>
    );
  }

  const firstName = profile.full_name.split(' ')[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        {/* Back link */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* ── Profile header ── */}
        <div className="flex flex-col items-center text-center">
          {/* Big avatar */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden ring-4 ring-white/10 shadow-[0_20px_40px_rgba(66,133,244,0.35)]">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-32 h-32 object-cover" />
              ) : (
                <span className="text-5xl font-black text-white">{getInitials(profile.full_name)}</span>
              )}
            </div>
            {profile.is_verified && (
              <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#4285F4] flex items-center justify-center border-4 border-slate-900">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </span>
            )}
          </div>

          {/* Name (big & bold) */}
          <h1 className="mt-6 text-4xl sm:text-5xl font-black tracking-tight text-white">{profile.full_name}</h1>
          <p className="mt-1 text-blue-200/80 text-sm">@{profile.username}</p>

          {/* Bio */}
          <p className="mt-6 max-w-xl text-white/70 leading-relaxed">
            {profile.bio
              ? profile.bio
              : `${firstName} doesn't have anything to say about themselves ¯\\_(ツ)_/¯`}
          </p>

          {/* Skill tags */}
          {profile.skill_tags && profile.skill_tags.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {profile.skill_tags.map(tag => (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${SKILL_COLORS[tag] ?? 'bg-white/10 text-white border-white/20'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Member since */}
          <p className="mt-6 flex items-center gap-1.5 text-xs text-white/50">
            <Calendar className="w-3.5 h-3.5" />
            Member since {formatDate(profile.created_at)}
          </p>

          {/* Stat row */}
          <div className="mt-8 grid grid-cols-3 gap-3 w-full max-w-md">
            {[
              { label: 'Threads', value: profile.thread_count },
              { label: 'Replies', value: profile.reply_count },
              { label: 'Upcoming', value: profile.upcoming_events.length },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl bg-white/5 border border-white/10 py-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/50 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Activity: discussions + registered events, side by side ── */}
        {(profile.recent_threads.length > 0 || profile.upcoming_events.length > 0) && (
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Recent forum activity ── */}
        {profile.recent_threads.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Recent Discussions</h2>
            <div className="space-y-3">
              {profile.recent_threads.map(t => (
                <Link
                  key={t.thread_id}
                  href={`/forum/${t.thread_id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {t.category_name && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: `#${t.category_color}` }}
                      >
                        {t.category_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <ThumbsUp className="w-3 h-3" />{t.upvote_count}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <MessageSquare className="w-3 h-3" />{t.reply_count}
                    </span>
                    <span className="text-[11px] text-gray-400">· {timeAgo(t.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Events registered for ── */}
        {profile.upcoming_events.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Events Registered for</h2>
            <div className="space-y-3">
              {profile.upcoming_events.map(e => (
                <Link
                  key={e.event_id}
                  href={`/events/${e.event_id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{e.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-400">
                      {e.category_name && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: `#${e.category_color}` }}
                        >
                          {e.category_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(e.start_datetime)}
                      </span>
                      {(e.is_online || e.venue) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{e.is_online ? 'Online' : e.venue}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        </div>
        )}

      </div>
    </div>
  );
}
