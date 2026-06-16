'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import NotificationBell from '@/components/ui/NotificationBell';

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(true);

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
  }, [user, token]);

  if (loading || !user) return null;

  const isAdminRole = ['editor', 'admin', 'super_admin'].includes(user.role_name);

  const upcomingEvents = registrations.filter(
    r => new Date(r.start_datetime) > new Date()
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user.full_name?.split(' ')[0] ?? 'Member'} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Events Registered', value: registrations.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Upcoming Events', value: upcomingEvents.length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Skills', value: user.skill_tags?.length ?? 0, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Member Since', value: formatDate(user.created_at), color: 'text-gray-600', bg: 'bg-gray-100' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${stat.bg} mb-2`}>
                <span className={`text-xs font-bold ${stat.color}`}>{typeof stat.value === 'number' ? stat.value : '—'}</span>
              </div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color} mt-0.5`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Upcoming Registrations</h2>
                <Link href="/dashboard/registrations" className="text-xs text-blue-500 hover:underline">
                  View all →
                </Link>
              </div>

              {regLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No upcoming events</p>
                  <Link href="/events" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
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
                        <p className="text-xs text-gray-400">{formatDate(reg.start_datetime)}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 flex-shrink-0">
                        Registered
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile + links column */}
          <div className="space-y-4">

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Google-color accent bar */}
              <div className="h-1 flex">
                <div className="flex-1 bg-[#4285F4]" />
                <div className="flex-1 bg-[#EA4335]" />
                <div className="flex-1 bg-[#FBBC05]" />
                <div className="flex-1 bg-[#34A853]" />
              </div>

              <div className="p-6">
                {/* Avatar + name */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-white">{user.full_name?.charAt(0) ?? 'M'}</span>
                      )}
                    </div>
                    {user.is_verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#4285F4] flex items-center justify-center border-2 border-white">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-400">@{user.username}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      {user.role_name?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Bio */}
                {user.bio ? (
                  <p className="text-xs text-gray-500 leading-relaxed mb-4 border-t border-gray-50 pt-4">{user.bio}</p>
                ) : (
                  <p className="text-xs text-gray-300 italic mb-4 border-t border-gray-50 pt-4">No bio yet — add one in Settings.</p>
                )}

                {/* Skill tags */}
                {user.skill_tags && user.skill_tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {user.skill_tags.map((tag: string) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SKILL_COLORS[tag] ?? 'bg-gray-50 text-gray-600 border-gray-100'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 italic mb-4">No skill tags — add some in Settings.</p>
                )}

                {/* Member since + join date */}
                <div className="flex items-center gap-1.5 mb-4 text-xs text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member since {formatDate(user.created_at)}
                </div>

                {/* Edit → Settings */}
                <Link
                  href="/settings"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Edit in Settings
                </Link>
              </div>
            </div>

            {/* Admin switch */}
            {isAdminRole && (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-3 p-4 rounded-2xl bg-gray-900 hover:bg-gray-800 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">Admin Dashboard</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role_name.replace('_', ' ')} access</p>
                </div>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Links</h3>
              <div className="space-y-1">
                {[
                  { href: '/events',                   label: 'Browse Events' },
                  { href: '/dashboard/registrations',  label: 'My Registrations' },
                  { href: '/forum',                    label: 'Community Forum' },
                  { href: '/settings',                 label: 'Settings' },
                  { href: '/settings#notifications',   label: 'Notification Settings' },
                ].map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all"
                  >
                    {link.label}
                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}