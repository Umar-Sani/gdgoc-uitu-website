'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/ui/NotificationBell';
import ActivityChart, { type ActivityItem } from '@/components/member/ActivityChart';
import LatestForumCard from '@/components/member/LatestForumCard';
import DiscoverEventsCard from '@/components/member/DiscoverEventsCard';
import { formatDate } from '@/lib/formatters';

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

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !token) return;

    fetch(`${API_URL}/api/users/me/registrations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => setRegistrations(res.data ?? []))
      .catch(() => {})
      .finally(() => setRegLoading(false));

    fetch(`${API_URL}/api/users/me/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => setActivities(res.data ?? []))
      .catch(() => {});
  }, [user, token]);

  if (loading || !user) return null;

  const upcomingEvents = registrations.filter(
    r => new Date(r.start_datetime) > new Date()
  ).slice(0, 4);

  const firstName = user.full_name?.split(' ')[0] ?? 'Member';

  // Forum engagement = threads + replies + upvotes (from already-loaded activity,
  // i.e. excludes event registrations).
  const forumEngagement = activities.filter(a => a.type !== 'registration').length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Compact profile card (public-profile styling) ── */}
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden shadow-sm mb-8">
        {/* Google-color accent bar */}
        <div className="h-1 flex">
          <div className="flex-1 bg-[#4285F4]" />
          <div className="flex-1 bg-[#EA4335]" />
          <div className="flex-1 bg-[#FBBC05]" />
          <div className="flex-1 bg-[#34A853]" />
        </div>
        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative p-5 sm:p-6">
          {/* Top: avatar + identity + bell */}
          <div className="flex items-start gap-4">
            <Link href={`/u/${user.username}`} className="relative flex-shrink-0 group" aria-label="My profile">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden ring-4 ring-white/10 shadow-[0_12px_30px_rgba(66,133,244,0.35)] group-hover:ring-white/20 transition-all">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-14 h-14 object-cover" />
                ) : (
                  <span className="text-xl font-black text-white">{user.full_name?.charAt(0) ?? 'M'}</span>
                )}
              </div>
              {user.is_verified && (
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4285F4] flex items-center justify-center border-2 border-slate-900">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </Link>

            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-200/70">Welcome back, {firstName} :)</p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">{user.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-blue-200/60">@{user.username}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/10 text-white border border-white/20 capitalize">
                  {user.role_name?.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <NotificationBell light />
            </div>
          </div>

          {/* Bio */}
          {user.bio ? (
            <p className="mt-4 text-sm text-white/60 leading-relaxed line-clamp-2">{user.bio}</p>
          ) : (
            <p className="mt-4 text-sm text-white/30 italic">No bio yet — add one in Settings.</p>
          )}

          {/* Skill tags */}
          {user.skill_tags && user.skill_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.skill_tags.map((tag: string) => (
                <span
                  key={tag}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SKILL_COLORS[tag] ?? 'bg-white/10 text-white border-white/20'}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom row: member since · inline stats · edit */}
          <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-white/10">
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Member since {formatDate(user.created_at)}
            </span>

            <div className="flex items-center gap-2">
              {[
                { label: 'Registered', value: registrations.length },
                { label: 'Engagement', value: forumEngagement },
                { label: 'Skills', value: user.skill_tags?.length ?? 0 },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-1.5"
                >
                  <span className="text-sm font-bold text-white">{stat.value}</span>
                  <span className="text-[10px] uppercase tracking-wide text-white/50">{stat.label}</span>
                </div>
              ))}

              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Edit in Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Activity chart */}
          <ActivityChart activities={activities} />

          {/* Recent Registrations */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Recent Registrations</h2>
              <Link href="/dashboard/registrations" className="text-xs text-blue-500 hover:underline">
                See all →
              </Link>
            </div>

            {regLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No upcoming events</p>
                <Link href="/dashboard/events" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
                  Browse events →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(reg => (
                  <Link
                    key={reg.registration_id}
                    href={`/events/${reg.event_id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-all border border-gray-50 hover:border-gray-200"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{reg.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {reg.category_name && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                            style={{ backgroundColor: `#${reg.category_color}` }}
                          >
                            {reg.category_name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDate(reg.start_datetime)}
                          {reg.venue ? ` · ${reg.venue}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 border ${
                      reg.is_free
                        ? 'bg-green-50 text-green-600 border-green-100'
                        : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                    }`}>
                      {reg.is_free ? 'Free' : 'Paid'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Right column ── */}
        <div className="space-y-6">

          {/* Discover Events promo */}
          <DiscoverEventsCard />

          {/* Latest Forum Discussions */}
          <LatestForumCard />

        </div>
      </div>
    </div>
  );
}
